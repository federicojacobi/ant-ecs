/**
 * @exports Entity
 * @class Entity
 *
 * @property {Map<String, Component>} components Map of components.
 */
export class Entity {
	
	/**
	 * @public
	 * @type {Number} */
	id = null;

	/**
	 * @constructor
	 */
	constructor() {
		this.components = new Map();
	}
}
