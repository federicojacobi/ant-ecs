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
		if ( 0 < this.entityPool.length ) {
			_entity = this.entityPool.pop();
		} else {
			_entity = new Entity();
		}
		this.entities.push( _entity );

		// When an entity is recycled, it might already be in some query results from its previous life.
		// We need to update queries for this new "empty" entity.
		this.updateQueries( _entity );

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

		if ( this.componentPool.has( type ) && 0 < this.componentPool.get( type ).length ) {

			// reset component
			const bp = this.blueprint.get( type );
			const newComponent = this.componentPool.get( type ).pop();
			Object.assign( newComponent, bp );
			return newComponent;
		}

		return { ...this.blueprint.get( type ) };
	}

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

	updateQueries( entity ) {
		for ( const [ query, results ] of this.queries.entries() ) {
			const index = results.indexOf( entity );
			const matches = query( entity );

			if ( matches && -1 === index ) {
				results.push( entity );
			} else if ( ! matches && -1 < index ) {
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

			for ( const results of this.queries.values() ) {
				const index = results.indexOf( entity );
				if ( -1 < index ) {
					results.splice( index, 1 );
				}
			}
		}

		while ( 0 < this.dirtyComponents.length ) {
			const component = this.dirtyComponents.pop();
			if ( ! this.componentPool.has( component.type ) ) {
				this.componentPool.set( component.type, []);
			}
			this.componentPool.get( component.type ).push( component );
		}
	}


	update( args ) {
		this.systems.forEach( system => system.update( args ) );
		this.#cleanup();
	}
}
