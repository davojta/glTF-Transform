import test from 'tape';
import { createPlatformIO } from '../../../test-utils';
import { Document, Format, JSONDocument, TextureInfo } from '@gltf-transform/core';

test('@gltf-transform/core::texture | read', async (t) => {
	const jsonDoc = {
		json: {
			asset: { version: '2.0' },
			textures: [{ source: 0, sampler: 0 }, { source: 1 }, { source: 0 }],
			samplers: [{ wrapS: 33071 }],
			images: [{ uri: 'tex1.png' }, { uri: 'tex2.jpeg' }],
			materials: [
				{ normalTexture: { index: 0 }, occlusionTexture: { index: 2 } },
				{ normalTexture: { index: 1 } },
			],
		},
		resources: {
			'tex1.png': new Uint8Array(1),
			'tex2.jpeg': new Uint8Array(2),
		},
	};

	const io = await createPlatformIO();
	const doc = await io.readJSON(jsonDoc as unknown as JSONDocument);
	const root = doc.getRoot();
	const mat1 = root.listMaterials()[0];
	const mat2 = root.listMaterials()[1];

	t.equals(root.listTextures().length, 2, 'reads two textures');
	t.equals(mat1.getNormalTexture().getURI(), 'tex1.png', 'assigns texture');
	t.equals(mat1.getOcclusionTexture().getURI(), 'tex1.png', 'reuses texture');
	t.equals(mat1.getNormalTextureInfo().getWrapS(), 33071, 'assigns sampler properties');
	t.equals(mat1.getOcclusionTextureInfo().getWrapS(), 10497, 'keeps default sampler properties');
	t.equals(mat2.getNormalTexture().getURI(), 'tex2.jpeg', 'assigns 2nd texture');
	t.equals(root.listTextures()[0].getMimeType(), 'image/png', 'assigns "image/png" MIME type');
	t.equals(root.listTextures()[1].getMimeType(), 'image/jpeg', 'assigns "image/jpeg" MIME type');
	t.end();
});

test('@gltf-transform/core::texture | write', async (t) => {
	const doc = new Document();
	doc.createBuffer();
	const image1 = new Uint8Array(1);
	const image2 = new Uint8Array(2);
	const image3 = new Uint8Array(3);
	const texture1 = doc.createTexture('tex1').setImage(image1).setURI('tex1.png');
	const texture2 = doc.createTexture('tex2').setImage(image2).setMimeType('image/jpeg');
	const texture3 = doc.createTexture('tex2').setImage(image3).setMimeType('image/jpeg'); // reused name
	doc.createMaterial('mat1').setBaseColorTexture(texture1).setNormalTexture(texture2).setOcclusionTexture(texture3);
	doc.createMaterial('mat2')
		.setBaseColorTexture(texture1)
		.getBaseColorTextureInfo()
		.setWrapS(TextureInfo.WrapMode.CLAMP_TO_EDGE);

	const io = await createPlatformIO();
	const jsonDoc = await io.writeJSON(doc, { basename: '' });

	t.false('basename.bin' in jsonDoc.resources, 'external image resources');
	t.true('tex1.png' in jsonDoc.resources, 'writes tex1.png');
	t.true('normal_1.jpg' in jsonDoc.resources, 'writes default-named normal map');
	t.true('occlusion_1.jpg' in jsonDoc.resources, 'writes default-named occlusion map');
	t.equals(jsonDoc.json.images.length, 3, 'reuses images');
	t.equals(jsonDoc.json.textures.length, 4, 'writes textures');
	t.equals(jsonDoc.json.samplers.length, 2, 'reuses samplers');
	t.end();
});

test('@gltf-transform/core::texture | copy', (t) => {
	const doc = new Document();
	const tex = doc
		.createTexture('MyTexture')
		.setImage(new Uint8Array(2))
		.setMimeType('image/gif')
		.setURI('path/to/image.gif');

	const tex2 = doc.createTexture().copy(tex);
	t.equals(tex2.getName(), 'MyTexture', 'copy name');
	t.deepEqual(tex2.getImage(), tex.getImage(), 'copy image');
	t.equals(tex2.getMimeType(), 'image/gif', 'copy mimeType');
	t.equals(tex2.getURI(), 'path/to/image.gif', 'copy URI');

	t.end();
});

test('@gltf-transform/core::texture | extras', async (t) => {
	const io = await createPlatformIO();
	const doc = new Document();
	doc.createBuffer();
	doc.createTexture('A').setExtras({ foo: 1, bar: 2 }).setImage(new Uint8Array(10)).setMimeType('image/png');

	const doc2 = await io.readJSON(await io.writeJSON(doc));

	t.deepEqual(doc.getRoot().listTextures()[0].getExtras(), { foo: 1, bar: 2 }, 'storage');
	t.deepEqual(doc2.getRoot().listTextures()[0].getExtras(), { foo: 1, bar: 2 }, 'roundtrip');

	t.end();
});

test('@gltf-transform/core::textureInfo | extras', async (t) => {
	const io = await createPlatformIO();
	const doc = new Document();
	doc.createBuffer();
	const texture = doc
		.createTexture('A')
		.setExtras({ foo: 1, bar: 2 })
		.setImage(new Uint8Array(10))
		.setMimeType('image/png');
	const material = doc.createMaterial().setBaseColorTexture(texture);
	material.getBaseColorTextureInfo()!.setExtras({ textureInfoID: 12345 });
	const doc2 = await io.readJSON(await io.writeJSON(doc));
	const rtMaterial = doc2.getRoot().listMaterials()[0];

	t.deepEqual(material.getBaseColorTextureInfo()!.getExtras(), { textureInfoID: 12345 }, 'storage');
	t.deepEqual(rtMaterial.getBaseColorTextureInfo()!.getExtras(), { textureInfoID: 12345 }, 'roundtrip');

	t.end();
});

test('@gltf-transform/core::texture | padding', async (t) => {
	// Ensure that buffer views are padded to 8-byte boundaries. See:
	// https://github.com/KhronosGroup/glTF/issues/1935

	const doc = new Document();
	doc.createBuffer();
	doc.createTexture().setImage(new Uint8Array(17)).setMimeType('image/png');
	doc.createTexture().setImage(new Uint8Array(21)).setMimeType('image/png');
	doc.createTexture().setImage(new Uint8Array(20)).setMimeType('image/png');

	const io = await createPlatformIO();
	const jsonDoc = await io.writeJSON(doc, { format: Format.GLB });

	t.deepEqual(
		jsonDoc.json.images,
		[
			{ bufferView: 0, mimeType: 'image/png' },
			{ bufferView: 1, mimeType: 'image/png' },
			{ bufferView: 2, mimeType: 'image/png' },
		],
		'images'
	);
	t.deepEqual(
		jsonDoc.json.bufferViews,
		[
			{ buffer: 0, byteOffset: 0, byteLength: 17 },
			{ buffer: 0, byteOffset: 24, byteLength: 21 },
			{ buffer: 0, byteOffset: 48, byteLength: 20 },
		],
		'bufferViews'
	);
	t.deepEqual(jsonDoc.json.buffers, [{ byteLength: 72 }], 'buffers');
	t.end();
});
