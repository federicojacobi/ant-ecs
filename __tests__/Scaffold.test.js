import { jest } from '@jest/globals';
import Scaffold from '../src/Scaffold.js';
import ECS from '../src/ECS.js';
import { Entity } from '../src/Entity.js';

describe('Scaffold Factory', () => {
	let ecs;
	let scaffold;

	beforeEach( () => {
		ecs = new ECS();
		// The Scaffold is now a factory, so we create a new instance for each test.
		scaffold = Scaffold( ecs );
	} );

	test( 'should return a scaffold object with create, addComponent, getEntity, and setEntity methods', () => {
		expect( scaffold ).toBeInstanceOf( Object );
		expect( typeof scaffold.create ).toBe( 'function' );
		expect( typeof scaffold.addComponent ).toBe( 'function' );
		expect( typeof scaffold.getEntity ).toBe( 'function' );
		expect( typeof scaffold.setEntity ).toBe( 'function' );
	});

	test( 'getEntity() should return null before an entity is created', () => {
		expect( scaffold.getEntity() ).toBeNull();
	} );

	test( 'create() should create a new entity and be chainable', () => {
		const getNextEntitySpy = jest.spyOn( ecs, 'getNextEntity' );

		const result = scaffold.create();

		expect( getNextEntitySpy ).toHaveBeenCalledTimes( 1 );
		const newEntity = scaffold.getEntity();
		expect( newEntity ).toBeInstanceOf( Entity );
		expect( result ).toBe( scaffold ); // for chaining

		getNextEntitySpy.mockRestore();
	} );

	test( 'addComponent() should add a component to the current entity', () => {
		ecs.registerComponent( { type: 'TestComponent', value: 'default' } );

		const result = scaffold.create().addComponent( 'TestComponent' );
		const entity = scaffold.getEntity();

		expect( entity.components.has( 'TestComponent' ) ).toBe( true );
		expect( entity.components.get( 'TestComponent' ).value ).toBe( 'default' );
		expect( result ).toBe( scaffold ); // for chaining
	} );

	test( 'addComponent() should add a component with arguments', () => {
		ecs.registerComponent( { type: 'Position', x: 0, y: 0 } );

		scaffold.create().addComponent( 'Position', { x: 100, y: 200 } );

		const entity = scaffold.getEntity();
		expect( entity.components.has( 'Position' ) ).toBe( true );

		const positionComponent = entity.components.get( 'Position' );
		expect( positionComponent.x ).toBe( 100 );
		expect( positionComponent.y ).toBe( 200 );
	});

	test( 'addComponent() should throw an error if called before create()', () => {
		ecs.registerComponent({ type: 'Position', x: 0, y: 0 });

		expect(() => {
			scaffold.addComponent('Position');
		}).toThrow(); // Throws TypeError because entity is null
	} );

	test('setEntity() should switch the active entity for scaffolding', () => {
		ecs.registerComponent({ type: 'ComponentA' });
		ecs.registerComponent({ type: 'ComponentB' });

		const entityA = scaffold.create().addComponent('ComponentA').getEntity();
		const entityB = ecs.getNextEntity();

		// Switch context to entityB
		scaffold.setEntity(entityB);
		scaffold.addComponent('ComponentB');

		// Check that entityA was not modified further
		expect(entityA.components.has('ComponentB')).toBe(false);

		// Check that entityB was modified
		expect(entityB.components.has('ComponentB')).toBe(true);
		expect(scaffold.getEntity()).toBe(entityB);
	});
});