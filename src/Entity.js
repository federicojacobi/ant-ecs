/**
 * @exports Entity
 * @class Entity
 *
 * @property {Map<String, Component>} components Map of components.
 */
export class Entity {
	/**
	 * @constructor
	 */
	constructor() {
		this.components = new Map();
	}
}
