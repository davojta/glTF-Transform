import { Accessor, Buffer, ElementGraph, Material, Mesh, Node, Primitive, Root, Scene, Texture } from './elements/index';

/**
 * Represents a glTF asset, and the dependencies among its resources. New resources (e.g. a
 * {@link Mesh} or {@link Material}) are created by calling factory methods on the container.
 */
export class Container {
	private graph: ElementGraph = new ElementGraph();
	private root: Root = new Root(this.graph);

	/** Returns the {@link Root} glTF instance. */
	public getRoot(): Root {
		return this.root;
	}

	/**
	 * Returns the {@link Graph} representing connectivity of resources within this container.
	 *
	 * @hidden
	 */
	public getGraph(): ElementGraph {
		return this.graph;
	}

	/** Clones this container and its graph, copying all resources within it. */
	public clone(): Container {
		throw new Error('Not implemented.');
	}

	/* Element factory methods. */

	/** Creates a new {@link Scene} attached to this container's {@link Root}. */
	createScene(name: string): Scene {
		const scene = new Scene(this.graph, name);
		this.root.addScene(scene);
		return scene;
	}

	/** Creates a new {@link Node} attached to this container's {@link Root}. */
	createNode(name: string): Node {
		const node = new Node(this.graph, name);
		this.root.addNode(node);
		return node;
	}

	/** Creates a new {@link Mesh} attached to this container's {@link Root}. */
	createMesh(name: string): Mesh {
		const mesh = new Mesh(this.graph, name);
		this.root.addMesh(mesh);
		return mesh;
	}

	/**
	 * Creates a new {@link Primitive}. Primitives must be attached to a {@link Mesh}
	 * for use and export.
	 */
	createPrimitive(): Primitive {
		const primitive = new Primitive(this.graph);
		return primitive;
	}

	/** Creates a new {@link Material} attached to this container's {@link Root}. */
	createMaterial(name: string): Material {
		const material = new Material(this.graph, name);
		this.root.addMaterial(material);
		return material;
	}

	/** Creates a new {@link Texture} attached to this container's {@link Root}. */
	createTexture(name: string): Texture {
		const texture = new Texture(this.graph, name);
		this.root.addTexture(texture);
		return texture;
	}

	/** Creates a new {@link Accessor} attached to this container's {@link Root}. */
	createAccessor(name: string, buffer: Buffer): Accessor {
		const accessor = new Accessor(this.graph, name).setBuffer(buffer);
		this.root.addAccessor(accessor);
		return accessor;
	}

	/** Creates a new {@link Buffer} attached to this container's {@link Root}. */
	createBuffer(name: string): Buffer {
		const buffer = new Buffer(this.graph, name);
		this.root.addBuffer(buffer);
		return buffer;
	}
}
