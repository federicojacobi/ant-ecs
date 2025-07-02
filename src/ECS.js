import { Entity } from './Entity.js';

/**
 * World container for all entities, components and systems.
 * @see {Entity}
 * @see {System}
 * @see {Component}
 * @exports ECS
 * @class ECS
 */
export default class ECS {

	/**
	 * All entities in the world.
	 * @type {Array<Entity>}
	 */
	entities = [];

	/**
	 * Pool of entities to be recycled.
	 * @private
	 * @type {Array<Entity>}
	 */
	entityPool = [];

	/**
	 * Entities to be removed from the world.
	 * @type {Array<Entity>}
	 */
	dirtyEntities = [];

	/**
	 * Components to be removed from the world.
	 * @type {Array<Component>}
	 */
	dirtyComponents = [];

	/**
	 * Map of queries and their results.
	 * @private
	 * @type {Map<Function, Array<Entity>>}
	 */
	#queries = new Map();

	/**
	 * Map of component types and their blueprints.
	 * @private
	 * @type {Map<String, Component>}
	 */
	#blueprint = new Map();

	/**
	 * Map of component types and their pools.
	 * @private
	 * @type {Map<String, Array<Component>>}
	 */
	#componentPool = new Map();

	/**
	 * All systems in the world.
	 * @private
	 * @type {Array<System>}
	 */
	#systems = [];

	/**
	 * Get a new entity from the pool or create a new one.
	 * @returns {Entity} The new or recycled entity.
	 */
	getNextEntity() {
		let _entity;
		if ( 0 < this.entityPool.length ) {
			_entity = this.entityPool.pop();
		} else {
			_entity = new Entity();
			_entity.id = this.entities.length;
		}
		this.entities.push( _entity );

		// When an entity is recycled, it might already be in some query results from its previous life.
		// We need to update queries for this new "empty" entity.
		this.updateQueries( _entity );

		return _entity;
	}

	/**
	 * Add an entity to the dirty list to be removed from the world at the end of the update cycle.
	 * @param {Entity} entity The entity to remove.
	 */
	killEntity( entity ) {
		this.dirtyEntities.push( entity );
	}

	/**
	 * Register a component type.
	 * @param {Component} component The component to register.
	 */
	registerComponent( component ) {
		this.#blueprint.set( component.type, component );
	}

	/**
	 * Get a new component from the pool or create a new one.
	 * @param {String} type The type of component to get.
	 * @returns {Component} The new or recycled component.
	 */
	getNextComponent( type ) {
		if ( ! this.#blueprint.has( type ) ) {
			throw new Error( `${type} component is not registered` );
		}

		if ( this.#componentPool.has( type ) && 0 < this.#componentPool.get( type ).length ) {

			// reset component
			const bp = this.#blueprint.get( type );
			const newComponent = this.#componentPool.get( type ).pop();
			Object.assign( newComponent, bp );
			return newComponent;
		}

		return { ...this.#blueprint.get( type ) };
	}

	/**
	 * Remove a component from an entity.
	 * @param {Entity} entity The entity to remove the component from.
	 * @param {Array<Component>|Component} components The component or components to remove.
	 * @returns {ECS} The ECS instance for chaining.
	 */
	removeComponent( entity, components = []) {
		const componentTypes = Array.isArray( components ) ? components : [ components ];

		componentTypes.forEach( componentType => {
			if ( entity.components.has( componentType ) ) {
				const componentObject = entity.components.get( componentType );
				this.dirtyComponents.push( componentObject );
				entity.components.delete( componentType );
			}
		});

		this.updateQueries( entity );

		return this;
	}

	/**
	 * Add a component to an entity.
	 * @param {Entity} entity The entity to add the component to.
	 * @param {Array<Component>|Component} components The component or components to add.
	 * @returns {ECS} The ECS instance for chaining.
	 */
	addComponent( entity, components = []) {
		if ( Array.isArray( components ) ) {
			components.forEach( component => {
				entity.components.set( component.type, component );
			});
		} else {
			entity.components.set( components.type, components );
		}

		this.updateQueries( entity );
		return this;
	}

	/**
	 * Update all queries for a given entity.
	 * @param {Entity} entity The entity to update the queries for.
	 */
	updateQueries( entity ) {
		for ( const [ query, results ] of this.#queries.entries() ) {
			const index = results.indexOf( entity );
			const matches = query( entity );

			if ( matches && -1 === index ) {
				results.push( entity );
			} else if ( ! matches && -1 < index ) {
				results.splice( index, 1 );
			}
		}
	}

	/**
	 * Query for entities that match a given function.
	 * @param {Function} fn The function to match entities against.
	 * @returns {Array<Entity>} The list of entities that match the query.
	 */
	query( fn ) {
		if ( this.#queries.has( fn ) ) {
			return this.#queries.get( fn );
		}

		const results = this.entities.filter( fn );

		this.#queries.set( fn, results );

		return results;
	}

	/**
	 * Add a system to the world.
	 * @param {System} system The system to add.
	 * @returns {System} The added system.
	 */
	addSystem( system ) {
		if ( ! this.#systems.includes( system ) ) {
			this.#systems.push( system );
			system.ecs = this;
			system.init();

			return system;
		}
		throw new Error( 'This system already exists' );
	}

	/**
	 * Cleanup dirty entities and components.
	 * @private
	 */
	#cleanup() {
		while ( 0 < this.dirtyEntities.length ) {
			const entity = this.dirtyEntities.pop();
			const entityIndex = this.entities.indexOf( entity );

			if ( -1 === entityIndex ) {
				continue;
			}

			const [ removed ] = this.entities.splice( entityIndex, 1 );

			removed.components.forEach( component => {
				this.dirtyComponents.push( component );
			});

			removed.components.clear();
			this.entityPool.push( removed );

			for ( const results of this.#queries.values() ) {
				const index = results.indexOf( entity );
				if ( -1 < index ) {
					results.splice( index, 1 );
				}
			}
		}

		while ( 0 < this.dirtyComponents.length ) {
			const component = this.dirtyComponents.pop();
			if ( ! this.#componentPool.has( component.type ) ) {
				this.#componentPool.set( component.type, []);
			}
			this.#componentPool.get( component.type ).push( component );
		}
	}

	/**
	 * Update all systems in the world.
	 * @param {any} args Arguments to pass to the systems' update method.
	 */
	update( args ) {
		this.#systems.forEach( system => system.update( args ) );
		this.#cleanup();
	}
}
