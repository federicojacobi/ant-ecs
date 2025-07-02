/**
 * @exports System
 * @class System
 *
 * @property {ECS} ecs The ECS instance.
 */
export default class System {
	/**
	 * Called when the system is added to the world.
	 */
	init() {}

	/**
	 * Called every frame.
	 * @param {any} delta
	 */
	update( delta ) {}

	/**
	 * Called when the system is removed from the world.
	 */
	destroy() {}
}
