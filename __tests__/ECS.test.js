import { jest } from '@jest/globals';
import ECS from '../src/ECS.js';
import { Entity } from '../src/Entity.js';
import System from '../src/System.js';

describe( 'ECS', () => {
	let ecs;

	beforeEach( () => {
		ecs = new ECS();
	});

	describe( 'Entity Management', () => {
		it( 'should create and retrieve a new entity', () => {
			expect( ecs.entities ).toHaveLength( 0 );
			const entity = ecs.getNextEntity();
			expect( entity ).toBeInstanceOf( Entity );
			expect( ecs.entities ).toHaveLength( 1 );
			expect( ecs.entities[0]).toBe( entity );
		});

		it( 'should mark an entity for removal but not delete it immediately', () => {
			const entity = ecs.getNextEntity();
			ecs.killEntity( entity );
			expect( ecs.dirtyEntities.has(entity) ).toBe(true);
			expect( ecs.entities ).toHaveLength( 1 );
		});

		it( 'should reuse killed entities from the entity pool after cleanup', () => {
			const entity1 = ecs.getNextEntity();
			ecs.killEntity( entity1 );
			ecs.update();

			expect( ecs.entities ).toHaveLength( 0 );
			expect( ecs.entityPool ).toEqual([ entity1 ]);

			const entity2 = ecs.getNextEntity();
			expect( entity2 ).toBe( entity1 ); // Should be the same recycled object
			expect( ecs.entityPool ).toHaveLength( 0 );
		});
	});

	describe( 'Component Management', () => {
		beforeEach( () => {
			ecs.registerComponent({ type: 'Position', x: 0, y: 0 });
			ecs.registerComponent({ type: 'Velocity', dx: 0, dy: 0 });
		});

		it( 'should register and create new components', () => {
			const position = ecs.getNextComponent( 'Position' );
			expect( position ).toEqual({ type: 'Position', x: 0, y: 0 });
		});

		it( 'should throw an error for unregistered components', () => {
			expect( () => ecs.getNextComponent( 'Unregistered' ) ).toThrow( 'Unregistered component is not registered' );
		});

		it( 'should add a component to an entity', () => {
			const entity = ecs.getNextEntity();
			const position = ecs.getNextComponent( 'Position' );
			ecs.addComponent( entity, position );

			expect( entity.components.has( 'Position' ) ).toBe( true );
			expect( entity.components.get( 'Position' ) ).toBe( position );
		});

		it( 'should remove a component from an entity and mark it for cleanup', () => {
			const entity = ecs.getNextEntity();
			const position = ecs.getNextComponent( 'Position' );
			ecs.addComponent( entity, position );

			ecs.removeComponent( entity, 'Position' );

			expect( entity.components.has( 'Position' ) ).toBe( false );
			expect( ecs.dirtyComponents ).toHaveLength( 1 );
			expect( ecs.dirtyComponents[0]).toBe( position );
		});

		it( 'should reuse components from the component pool after cleanup', () => {
			const entity = ecs.getNextEntity();
			const position1 = ecs.getNextComponent( 'Position' );
			ecs.addComponent( entity, position1 );
			ecs.removeComponent( entity, 'Position' );

			ecs.update();

			const position2 = ecs.getNextComponent( 'Position' );
			expect( position2 ).toBe( position1 ); // Should be the same recycled object
		});
	});

	describe( 'System Management', () => {
		let mockSystem;

		beforeEach( () => {
			mockSystem = new System();
			mockSystem.init = jest.fn();
			mockSystem.update = jest.fn();
		});

		it( 'should add a system and call its init method', () => {
			ecs.addSystem( mockSystem );
			expect( mockSystem.init ).toHaveBeenCalledTimes( 1 );
			expect( mockSystem.ecs ).toBe( ecs );
		});

		it( 'should not add the same system twice', () => {
			ecs.addSystem( mockSystem );
			expect( () => ecs.addSystem( mockSystem ) ).toThrow( 'This system already exists' );
		});

		it( 'should call update on all systems', () => {
			const anotherSystem = new System();
			anotherSystem.update = jest.fn();
			ecs.addSystem( mockSystem );
			ecs.addSystem( anotherSystem );

			ecs.update( 0.16 );

			expect( mockSystem.update ).toHaveBeenCalledWith( 0.16 );
			expect( anotherSystem.update ).toHaveBeenCalledWith( 0.16 );
		});
	});

	describe( 'Querying', () => {
		const hasPosition = e => e.components.has( 'Position' );

		beforeEach( () => {
			ecs.registerComponent({ type: 'Position', x: 0, y: 0 });
			ecs.registerComponent({ type: 'Velocity', dx: 0, dy: 0 });
		});

		it( 'should return entities matching a query and cache the result', () => {
			const entity = ecs.getNextEntity();
			ecs.addComponent( entity, ecs.getNextComponent( 'Position' ) );

			const results1 = ecs.query( hasPosition );
			expect( results1 ).toEqual([ entity ]);

			const results2 = ecs.query( hasPosition );
			expect( results2 ).toBe( results1 ); // Should be the same cached array
		});

		it( 'should update query cache when a component is added', () => {
			const entity = ecs.getNextEntity();
			const results = ecs.query( hasPosition );
			expect( results ).toHaveLength( 0 );

			ecs.addComponent( entity, ecs.getNextComponent( 'Position' ) );
			expect( results ).toHaveLength( 1 );
			expect( results[0]).toBe( entity );
		});

		it( 'should update query cache when a component is removed', () => {
			const entity = ecs.getNextEntity();
			ecs.addComponent( entity, ecs.getNextComponent( 'Position' ) );

			const results = ecs.query( hasPosition );
			expect( results ).toHaveLength( 1 );

			ecs.removeComponent( entity, 'Position' );
			expect( results ).toHaveLength( 0 );
		});

		it( 'should update query cache when an entity is killed and cleaned up', () => {
			const entity = ecs.getNextEntity();
			ecs.addComponent( entity, ecs.getNextComponent( 'Position' ) );
			const results = ecs.query( hasPosition );
			expect( results ).toHaveLength( 1 );

			ecs.killEntity( entity );
			ecs.update();

			expect( results ).toHaveLength( 0 );
		});
	});
});
