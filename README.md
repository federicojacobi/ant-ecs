# Ant ECS

This ECS implementation is meant to be small and understandable. Although it is pretty fast, it is not performance focused. If you really need a performance focused ECS framework should you be using Javascript to begin with?

Read more here: https://en.wikipedia.org/wiki/Entity_component_system

## Is this a game engine?

No. But you can probably make it work with your engine of choice.

## ECS Basics

(E)ntity (C)omponent (S)ystem is an architecture pattern mostly used in video game development. Entities are nothing more than an id of a game object. Components are piece of data with no logic attached that describe the status of the game object. And Systems consist of the code that modifies the data provided by components.

In JS it is much simpler to think of an entity as an object rather than an id (this is called an object-based ECS). This makes for understandable logic.

- Entities don't do anything, they are just an empty object {}. No methods, no properties, no prototypes, no nothing!
- Components don't do anything! They don't do logic, they don't add x+y, they don't translate coordinates. They just hold data.
- Systems do the work! they create/remove entities and modify components. They work by themselves and are independant from anything going on in your game world

## Install

If you use ES modules:

`npm install ant-ecs`

If you don't, just use the `ant-ecs.js` file from the `/dist/` directory in a `<script>` tag.

## How to use

```
import {scaffold, ECS, System} from "ant-ecs";

// Instantiate ECS. This is your world.
const ecs = new ECS();

// Register components one by one. 
ecs.registerComponent( {
	type: 'Position',	// type is required, the rest is up to you
	x: 0,
	y: 0
} );

// Create a system
class MovementSystem extends System {
	constructor() {
		super();
		// Create a selector for your system. This will be used to query the world for entities that match. See `ecs.query()` below.
		this.selector = ( e ) => e.components.has( 'Position' ); // Give me all the entities that have the 'Position' component
	}

	update( delta ) {
		this.ecs.query( this.selector )		// DO NOT use an anonymous function here. It will break the caching system
		.forEach( entity => {
			const position = entity.components.get( 'Position' );
			position.x += 10 * delta;
		} );
	}
}

// Add your system to the world.
ecs.addSystem( new MovementSystem() );

// Now all the setup it done. Create a couple of objects
for ( let i = 0; i < 10; i++ ) {
	// Create an empty entity
	const entity = ecs.getNextEntity();

	// Create a position (we registered it beforehand) component.
	const position = ecs.getNextComponent( 'Position' );
	position.x = i * 10;

	// Add the component to the entity
	ecs.addComponent( entity, position );
}

// Here comes the game loop
const loop = () => {
	const now = (performance || Date).now();

	// Update all the systems.
	ecs.update( (now - last || now) / 1000 );

	frame = requestAnimationFrame(loop);
};
loop();

```

## Scaffold

The description above is good and all ... but it is a little too verbose, especially when you want to add multiple components. This is where the scaffold comes into play, it is no magic, but makes writing object creation a bit more straight-forward. Let's rewrite the loop above:

```
// you only need to do this once
scaffold.setup( ecs );

for ( let i = 0; i < 10; i++ ) {
	// Create an empty entity
	scaffold.create()
	.addComponent( 'Position', {
		x: i * 10
	} );
}
```

That's much better! and you can chain the addition of components like so:

```
scaffold.create()
.addComponent( 'Position', {
	x: i * 10
} )
.addComponent( 'foo', {
	value: i
} )
.addComponent( 'bar' )
.addComponent( 'baz', {
	health: 100
} );
```

## Removal of entities and components

When you delete an entity with `ecs.killEntity( e );` or you remove a component with `ecs.removeComponent( entity, [ components ] );` they aren't deleted immediately. Both will be marked dirty and removed at the end of all systems updates. This way all entities and components are available to all systems even after removal, but only for that frame.