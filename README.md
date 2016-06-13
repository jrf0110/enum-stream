# Enumeration Stream

> Add enumeration methods (like map, filter, forEach, reduce) to streams!

```
npm install -S enum-stream
```

__Example__

```javascript
const EnumStream = require('enum-stream');

EnumStream
  .create( someObjectModeStream, {
    // How many objects to keep in memory at once
    concurrency: 100
  })
  .map( user => new User( user ) )
  .filterAsync( ( user, done ) => user.hasRegistered( done ) )
  .mapAsync( ( user, done ) => user.updateSomethingAsync({ ... }, done ) )
  // Synchronous iterator
  .forEach( user => process.stdout.write('.') )
  // Synchronous error handlers
  .errors( error => process.stdout.write('x') )
  // Also supports a callback so you can process errors asynchronously
  // and the EnumStream won't call `end` until all errors are handled
  .errorsAsync( ( error, done ) => {
    errorLog.write( JSON.stringify( error ), done );
  })
  // When everything has finished and the stream has ended
  .end( ()=> errorLog.end( ()=> process.exit(0) ) )
```

## API

#### `constructor( stream[, options] ) -> EnumStream`

Creates a new EnumStream.

__Alias:__ `EnumStream.create( stream[, options] )`

__Options:__

```javascript
{
  // How many objects to keep in memory
  concurrency: 1
}
```

#### `.map( functor(obj) ) -> this`

Maps the data object to a new value:

```javascript
EnumStream.create( s )
  .map( obj => transformObj( obj ) )
```

#### `.mapAsync( functor(obj, callback) )`

Same as `.map`, but with a callback:

```javascript
EnumStream.create( s )
  .mapAsync( (obj, done) => transformObjAsync( obj, done ) )
```

#### `.filter( functor(obj) )`

Filters values from the stream. If `functor` returns true, the value stays. If `functor` returns false, the value is omitted.

```javascript
EnumStream.create( s )
  .filter( obj => obj.val > 10 )
```

#### `.filterAsync( functor(obj, callback) )`

Same as `.filter`, but with a callback:

```javascript
EnumStream.create( s )
  .filterAsync( (obj, done) => {
    setTimeout( ()=> done( obj.val > 10 ), 100 )
  })
```

#### `.forEach( functor(obj) )`

Registers an iteration handler:

```javascript
EnumStream.create( s )
  .forEach( obj => console.log('processing', obj) )
```

#### `.reduce( functor(newValue, obj) )`

Consumes and reduces the stream to a single value. NOTE: you cannot add new enumeration actions after reducing:

```javascript
EnumStream.create( users )
  .map( user => new UserDatabaseModel( user ) )
  .mapAsync( (user, done) => user.fetch( done ) )
  // Create a report
  .reduce( ( report, user ) => {
    if ( user.name === 'Bob' ){
      report.numUsersNamedBob++;
    } else if ( user.name === 'Alice' ){
      report.numUsersNamedAlice++;
    } else {
      report.other++;
    }

    return report;
  }, {
    numUsersNamedBob: 0
  , numUsersNamedAlice: 0
  , other: 0
  })
```

#### `.end( function([reducedValue]) )`

Registers an end handler. Called when the stream has ended:

```javascript
EnumStream.create( users )
  .map( user => new UserDatabaseModel( user ) )
  .mapAsync( (user, done) => user.fetch( done ) )
  .mapAsync( (user, done) => process.stdout.write( JSON.stringify( user ), done ) )
  .end( ()=> {
    console.log('complete');
    process.exit(0);
  })
```

#### `.errors( function(error) )`

Registers an error handler. Called when the underlying stream emits an error or when an async action calls back with an error:

```javascript
EnumStream.create( users )
  .map( user => new UserDatabaseModel( user ) )
  .mapAsync( (user, done) => {
    user.fetch( ( error, user ) => {
      if ( error ){
        // Attach useful information to the error
        error.user_id = user.id;
        return done( error );
      }
    })
  })
  .errors( error => console.log('User', error.user_id, 'failed to load') )
```

#### `.errorsAsync()`

Same as `.errors` but with a callback to let EnumStream know you're done processing.

```javascript
EnumStream.create( users )
  .map( user => new UserDatabaseModel( user ) )
  .mapAsync( (user, done) => {
    user.fetch( ( error, user ) => {
      if ( error ){
        // Attach useful information to the error
        error.user_id = user.id;
        return done( error );
      }
    })
  })
  .errorsAsync( ( error, done ) => {
    errorLog.write( JSON.stringify( error ), done );
  })
```