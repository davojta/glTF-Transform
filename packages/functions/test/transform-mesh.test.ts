require('source-map-support').install();

import test from 'tape';
import { bbox, Document, Logger, Primitive, PrimitiveTarget, vec3 } from '@gltf-transform/core';
import { fromScaling, fromTranslation, fromRotation, identity } from 'gl-matrix/mat4';
import { transformMesh, transformPrimitive } from '../';

const logger = new Logger(Logger.Verbosity.SILENT);

test('@gltf-transform/functions::transformPrimitive', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createPrimitive(document);
	const normal = prim.getAttribute('NORMAL')!;
	const tangent = prim.getAttribute('TANGENT')!;

	transformPrimitive(prim, identity([]));
	t.deepEquals(primBounds(prim), { min: [-0.5, 10, -0.5], max: [0.5, 10, 0.5] }, 'identity - position');
	t.deepEquals(normal.getElement(0, []), [0, 1, 0], 'identity - normal');
	t.deepEquals(tangent.getElement(0, []), [1, 0, 0, 1], 'identity - tangent');

	transformPrimitive(prim, fromScaling([], [100, 100, 100]), new Set([0, 1, 2, 3]));
	t.deepEquals(primBounds(prim), { min: [-0.5, 10, -0.5], max: [0.5, 10, 0.5] }, 'mask - position');
	t.deepEquals(normal.getElement(0, []), [0, 1, 0], 'mask - normal');
	t.deepEquals(tangent.getElement(0, []), [1, 0, 0, 1], 'mask - tangent');

	transformPrimitive(prim, fromScaling([], [2, 1, 2]));
	t.deepEquals(primBounds(prim), { min: [-1, 10, -1], max: [1, 10, 1] }, 'scale - position');
	t.deepEquals(normal.getElement(0, []), [0, 1, 0], 'scale - normal');
	t.deepEquals(tangent.getElement(0, []), [1, 0, 0, 1], 'scale - tangent');

	transformPrimitive(prim, fromTranslation([], [0, -10, 0]));
	t.deepEquals(primBounds(prim), { min: [-1, 0, -1], max: [1, 0, 1] }, 'translate - positino');
	t.deepEquals(normal.getElement(0, []), [0, 1, 0], 'translate - normal');
	t.deepEquals(tangent.getElement(0, []), [1, 0, 0, 1], 'translate - tangent');

	transformPrimitive(prim, fromRotation([], Math.PI / 2, [1, 0, 0]));
	t.deepEquals(roundBbox(primBounds(prim)), { min: [-1, -1, 0], max: [1, 1, 0] }, 'rotate - position');
	t.deepEquals(normal.getElement(0, []).map(round()), [0, 0, 1], 'rotate - normal');
	t.deepEquals(tangent.getElement(0, []).map(round()), [1, 0, 0, 1], 'rotate - tangent');

	t.end();
});

test('@gltf-transform/functions::transformMesh | detach shared prims', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createPrimitive(document);
	const meshA = document.createMesh('A').addPrimitive(prim);
	const meshB = document.createMesh('B').addPrimitive(prim);

	t.equals(meshA.listPrimitives()[0], meshB.listPrimitives()[0], 'meshA = meshB, before');

	transformMesh(meshA, fromScaling([], [2, 2, 2]), true);

	t.notEquals(meshA.listPrimitives()[0], meshB.listPrimitives()[0], 'meshA ≠ meshB, after');
	t.end();
});

test('@gltf-transform/functions::transformMesh | detach shared vertex streams', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createPrimitive(document);
	const primA = prim.clone();
	const primB = prim.clone();
	const meshA = document.createMesh('A').addPrimitive(primA);
	document.createMesh('B').addPrimitive(primB);

	t.equals(primA.getAttribute('POSITION'), primB.getAttribute('POSITION'), 'primA = primB, before');

	transformMesh(meshA, fromScaling([], [2, 2, 2]), true);

	t.equals(primA.getAttribute('POSITION'), primB.getAttribute('POSITION'), 'primA = primB, after (overwrite=true)');

	transformMesh(meshA, fromScaling([], [2, 2, 2]), false);

	t.notEquals(
		primA.getAttribute('POSITION'),
		primB.getAttribute('POSITION'),
		'primA ≠ primB, after (overwrite=false)'
	);
	t.end();
});

test('@gltf-transform/functions::transformMesh | skip indices', async (t) => {
	const document = new Document().setLogger(logger);
	const prim = createPrimitive(document);
	const mesh = document.createMesh().addPrimitive(prim);

	transformMesh(mesh, fromScaling([], [2, 2, 2]), false, new Set([0, 1]));

	// prettier-ignore
	t.deepEquals(
		Array.from(mesh.listPrimitives()[0]!.getAttribute('POSITION')!.getArray()!),
		[
			0.5, 10, 0.5,
			0.5, 10, -0.5,
			-1, 20, -1,
			-1, 20, 1,
		],
		'transform skips excluded indices'
	);
	t.end();
});

/* UTILITIES */

/** Creates a rounding function for given decimal precision. */
function round(decimals = 4): (v: number) => number {
	const f = Math.pow(10, decimals);
	return (v: number) => {
		v = Math.round(v * f) / f;
		v = Object.is(v, -0) ? 0 : v;
		return v;
	};
}

function roundBbox(bbox: bbox, decimals = 4): bbox {
	return {
		min: bbox.min.map(round(decimals)) as vec3,
		max: bbox.max.map(round(decimals)) as vec3,
	};
}

function primBounds(prim: Primitive | PrimitiveTarget): bbox {
	return {
		min: prim.getAttribute('POSITION')!.getMinNormalized([]) as vec3,
		max: prim.getAttribute('POSITION')!.getMaxNormalized([]) as vec3,
	};
}

function createPrimitive(document: Document): Primitive {
	const prim = document
		.createPrimitive()
		.setMode(Primitive.Mode.POINTS)
		.setAttribute(
			'POSITION',
			// prettier-ignore
			document
				.createAccessor('POSITION')
				.setType('VEC3')
				.setArray(new Float32Array([
					0.5, 10, 0.5,
					0.5, 10, -0.5,
					-0.5, 10, -0.5,
					-0.5, 10, 0.5,
				]))
		)
		.setAttribute(
			'NORMAL',
			// prettier-ignore
			document
				.createAccessor('NORMAL')
				.setType('VEC3')
				.setArray(
					new Float32Array([
						0, 1, 0,
						0, 1, 0,
						0, 1, 0,
						0, 1, 0,
					])
				)
		)
		.setAttribute(
			'TANGENT',
			// prettier-ignore
			document
				.createAccessor('TANGENT')
				.setType('VEC4')
				.setArray(
					new Float32Array([
						1, 0, 0, 1,
						1, 0, 0, 1,
						1, 0, 0, 1,
						1, 0, 0, 1,
					])
				)
		);
	return prim;
}
