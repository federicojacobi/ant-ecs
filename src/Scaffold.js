export const scaffold = {
	/**
	 * Setup ECS for use later.
	 *
	 * @param {ECS} ecs 
	 */
	setup( ecs ) {
		this.ecs = ecs;
		return this;
	},

	/**
	 * Create a new entity.
	 *
	 * @returns this
	 */
	create() {
		this.entity = this.ecs.getNextEntity();
		return this;
	},

	/**
	 * Create a new component and add to the current entity.
	 *
	 * @param {*} component 
	 * @returns 
	 */
	addComponent( component, args = null ) {
		const _component = this.ecs.getNextComponent( component );
		this.ecs.addComponent( this.entity, _component );
		if ( args !== null ) {
			Object.assign( _component, args );
		}
		return this;
	}
}