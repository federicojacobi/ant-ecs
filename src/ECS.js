import { Entity } from './Entity.js';

export default class ECS {
	constructor() {
		this.entities = [];
		this.entityPool = [];

		this.dirtyEntities = [];
		this.dirtyComponents = [];

		this.queries = new Map();
		this.blueprint = new Map();
		this.componentPool = new Map();

		this.systems = [];
	}

	getNextEntity() {
		let _entity;
		if ( this.entityPool.length > 0 ) {
			_entity = this.entityPool.pop();
		} else {
			_entity = new Entity();
		}
		this.entities.push( _entity );

		// When an entity is recycled, it might already be in some query results from its previous life.
		// We need to update queries for this new "empty" entity.
		this.updateQueries(_entity);

		return _entity;
	}

	killEntity( entity ) {
		this.dirtyEntities.push( entity );
	}

	registerComponent( c ) {
		this.blueprint.set( c.type, c );
	}

	getNextComponent( type ) {
		if ( ! this.blueprint.has( type ) ) {
			throw new Error( `${type} component is not registered` );
		}

		if ( this.componentPool.has( type ) && this.componentPool.get( type ).length > 0 ) {
			// reset component
			const bp = this.blueprint.get( type );
			const newComponent = this.componentPool.get( type ).pop();
			Object.assign( newComponent, bp );
			return newComponent;
		}

		return { ...this.blueprint.get( type ) };
	}

	removeComponent( entity, components = [] ) {
		// FIX: Refactored to handle component objects correctly for cleanup
		const componentTypes = Array.isArray(components) ? components : [components];

		componentTypes.forEach(componentType => {
			if (entity.components.has(componentType)) {
				// Get the component object before deleting it from the entity
				const componentObject = entity.components.get(componentType);
				this.dirtyComponents.push(componentObject); // Push the actual component object for recycling
				entity.components.delete(componentType);
			}
		});
		
		this.updateQueries( entity );

		return this;
	}

	addComponent( entity, components = [] ) {
		if ( Array.isArray( components ) ) {
			components.forEach( component => {
				entity.components.set( component.type, component );
			} );
		} else {
			entity.components.set( components.type, components );
		}
		
		this.updateQueries( entity );
		return this;
	}

	updateQueries( entity ) {
		// FIX: Correctly remove entities from query results instead of deleting the whole query
		for ( const [query, results] of this.queries.entries() ) {
			const index = results.indexOf( entity );
			const matches = query( entity );

			if ( matches && index === -1 ) {
				results.push( entity );
			} else if ( !matches && index > -1 ) {
				results.splice( index, 1 );
			}
		}
	}

	query( fn ) {
		if ( this.queries.has( fn ) ) {
			return this.queries.get( fn );
		}

		const results = this.entities.filter( fn );

		this.queries.set( fn, results );

		return results;
	}

	addSystem( system ) {
		if ( ! this.systems.includes( system ) ) {
			this.systems.push( system );
			system.ecs = this;
			system.init();

			return system;
		}
		throw new Error( 'This system already exists' );
	}

	#cleanup() {
		// Process killed entities
		while ( this.dirtyEntities.length > 0 ) {
			const entity = this.dirtyEntities.pop();
			const entityIndex = this.entities.indexOf(entity);

			if (entityIndex === -1) continue; // Already processed or never added

			const [removed] = this.entities.splice( entityIndex, 1 );

			// Mark all its components for cleanup
			removed.components.forEach( component => {
				this.dirtyComponents.push( component );
			} );
	
			// Clear its component map and add to pool for reuse
			removed.components.clear();
			this.entityPool.push( removed );

			// FIX: Correctly remove entity from all query results
			for ( const results of this.queries.values() ) {
				const index = results.indexOf( entity );
				if ( index > -1 ) {
					results.splice( index, 1 );
				}
			}
		}

		while ( this.dirtyComponents.length > 0 ) {
			const component = this.dirtyComponents.pop();
			if ( ! this.componentPool.has( component.type ) ) {
				this.componentPool.set( component.type, [] );
			}
			this.componentPool.get( component.type ).push( component );
		}
	}


	update( args ) {
		this.systems.forEach( system => system.update( args ) );
		this.#cleanup();
	}
}