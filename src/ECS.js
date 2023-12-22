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
		if ( this.entityPool.lenth > 0 ) {
			_entity = this.entityPool.pop();
		} else {
			_entity = new Entity();
		}
		this.entities.push( _entity );

		return _entity;
	}

	killEntity( entity ) {
		this.dirtyEntities.push( entity );
	}

	registerComponent( c ) {
		this.blueprint.set( c.type, c );
	}

	getNextComponent( type ) {
		if ( this.componentPool.has( type ) && this.componentPool.get( type ).length > 0 ) {
			return this.componentPool.get( type ).pop();
		}

		if ( ! this.blueprint.has( type ) ) {
			throw new Error( `${type} component is not registered` );
		}
		return { ...this.blueprint.get( type ) };
	}

	removeComponent( entity, components = [] ) {
		if ( Array.isArray( components ) ) {
			components.forEach( component => {
				entity.components.delete( component );
				this.dirtyComponents.push( component );
			} );
		} else {
			entity.components.delete( components );
			this.dirtyComponents.push( components );
		}

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
		const queries = this.queries.keys();
		for ( const query of queries ) {
			const results = this.queries.get( query );
			const index = results.indexOf( entity );

			if ( query( entity ) ) {
				if ( index === - 1 ) {
					results.push( entity );
				}
			} else {
				if ( index > -1 ) {
					this.queries.delete( query );
				}
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
		if ( this.systems.indexOf( system ) === -1 ) {
			this.systems.push( system );
			system.ecs = this;
			system.init();

			return system;
		}
		throw new Error( 'This system already exists' );
	}

	cleanup() {
		while ( this.dirtyEntities.length > 0 ) {
			const entity = this.dirtyEntities.pop();
			const removed = this.entities.splice( this.entities.indexOf( entity ), 1 )[0];
			removed.components.forEach( component => {
				this.dirtyComponents.push( component );
			} );
	
			removed.components.clear();
			this.entityPool.push( removed );

			const queries = this.queries.keys();
			for ( const query of queries ) {
				const results = this.queries.get( query );
				const index = results.indexOf( entity );

				if ( index > -1 ) {
					this.queries.delete( query );
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
		this.cleanup();
	}
}