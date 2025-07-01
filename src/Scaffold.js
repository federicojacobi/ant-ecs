/**
 * Helper to create entities and quickly add components.
 *
 * @param {*} _ecs The ECS instance.
 * @returns a Scaffold object.
 */
export function Scaffold( _ecs ) {
	const ecs = _ecs;
	let entity = null;
	return {
		/**
		 * Create a new entity.
		 *
		 * @returns this
		 */
		create() {
			entity = ecs.getNextEntity();
			return this;
		},

		/**
		 * Create a new component and add to the current entity.
		 *
		 * @param {*} component 
		 * @returns 
		 */
		addComponent( component, args = null ) {
			if ( ! entity ) {
				throw 'Create an entity before adding a component.';
			}
			const _component = ecs.getNextComponent( component );
			ecs.addComponent( entity, _component );
			if ( args !== null ) {
				Object.assign( _component, args );
			}
			return this;
		},

		/**
		 * Returns the entity that was last created.
		 * @returns {Entity} The current entity.
		 */
		getEntity() {
			return entity;
		}
	}
}