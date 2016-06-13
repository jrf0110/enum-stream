'use strict';

var assert = require('assert');
var Stream = require('stream');
var EnumStream = require('../lib/enum-stream');

class TestStream extends Stream.Readable {
  _read(){}
}

describe('EnumStream', function(){
  it('.map()', function( done ){
    var objs = [
      { foo: 'bar' }
    , { foo: 'foo' }
    , { foo: 'waff' }
    , { foo: 'stack' }
    ];

    var s = new TestStream({ objectMode: true });
    var numIterations = 0;

    new EnumStream( s, { concurrency: 1 })
      .map( ( obj )=>{
        return { foo: obj.foo + ' foo' }
      })
      .forEach( ( obj )=>{
        assert.equal( obj.foo, objs[ numIterations ].foo + ' foo' );
        numIterations++;
      })
      .errors( ( error )=>{
        assert( !error );
      })
      .end( ()=>{
        assert.equal( numIterations, objs.length );
        done();
      });

      objs.forEach( ( obj, i ) => setTimeout( s.push.bind( s, obj ), i * 5 ) );
      setTimeout( s.push.bind( s, null ), objs.length * 5 );
  });

  it('.mapAsync()', function( done ){
    var objs = [
      { foo: 'bar' }
    , { foo: 'foo' }
    , { foo: 'waff' }
    , { foo: 'stack' }
    ];

    var s = new TestStream({ objectMode: true });
    var numIterations = 0;

    new EnumStream( s, { concurrency: 1 })
      .mapAsync( ( obj, done )=>{
        setTimeout( ()=>{
          done( null, {
            foo: obj.foo + ' foo'
          })
        }, 10 );
      })
      .forEach( ( obj )=>{
        assert.equal( obj.foo, objs[ numIterations ].foo + ' foo' );
        numIterations++;
      })
      .errors( ( error )=>{
        assert( !error );
      })
      .end( ()=>{
        assert.equal( numIterations, objs.length );
        done();
      });

      objs.forEach( ( obj, i ) => setTimeout( s.push.bind( s, obj ), i * 5 ) );
      setTimeout( s.push.bind( s, null ), objs.length * 5 );
  });

  it('.filter()', function( done ){
    var objs = [
      { foo: 'bar' }
    , { foo: 'foo' }
    , { foo: 'waff' }
    , { foo: 'stack' }
    ];

    var s = new TestStream({ objectMode: true });
    var numIterations = 0;

    new EnumStream( s, { concurrency: 1 })
      .filter( ( obj )=>{
        return [ 'foo', 'waff' ].indexOf( obj.foo ) > -1;
      })
      .forEach( ( obj )=>{
        numIterations++;
        assert( [ 'foo', 'waff' ].indexOf( obj.foo ) > -1 );
      })
      .errors( ( error )=>{
        assert( !error );
      })
      .end( ()=>{
        assert.equal( numIterations, 2 );
        done();
      });

      objs.forEach( ( obj, i ) => setTimeout( s.push.bind( s, obj ), i * 5 ) );
      setTimeout( s.push.bind( s, null ), objs.length * 5 );
  });

  it('.filterAsync()', function( done ){
    var objs = [
      { foo: 'bar' }
    , { foo: 'foo' }
    , { foo: 'waff' }
    , { foo: 'stack' }
    ];

    var s = new TestStream({ objectMode: true });
    var numIterations = 0;

    new EnumStream( s, { concurrency: 1 })
      .filterAsync( ( obj, done )=>{
        setTimeout( ()=>{
          done( null, [ 'foo', 'waff' ].indexOf( obj.foo ) > -1 )
        }, 10 );
      })
      .forEach( ( obj )=>{
        numIterations++;
        assert( [ 'foo', 'waff' ].indexOf( obj.foo ) > -1 );
      })
      .errors( ( error )=>{
        assert( !error );
      })
      .end( ()=>{
        assert.equal( numIterations, 2 );
        done();
      });

      objs.forEach( ( obj, i ) => setTimeout( s.push.bind( s, obj ), i * 5 ) );
      setTimeout( s.push.bind( s, null ), objs.length * 5 );
  });

  it('.errorsAsync()', function( done ){
    var objs = [
      { foo: 'bar' }
    , { foo: 'foo' }
    , { foo: 'waff' }
    , { foo: 'stack' }
    ];

    var s = new TestStream({ objectMode: true });
    var numIterations = 0;

    new EnumStream( s, { concurrency: 1 })
      .errorsAsync( ( error, done )=>{
        setTimeout( ()=>{
          numIterations++;
          assert( error );
          done();
        }, 10 );
      })
      .mapAsync( ( obj, next )=> next( new Error('foo') ) )
      .end( ()=>{
        assert.equal( numIterations, 4 );
        done();
      });

      objs.forEach( ( obj, i ) => setTimeout( s.push.bind( s, obj ), i * 5 ) );
      setTimeout( s.push.bind( s, null ), objs.length * 5 );
  });

  it('should handle concurrency > 1', function( done ){
    var objs = [
      { foo: 'bar' }
    , { foo: 'foo' }
    , { foo: 'waff' }
    , { foo: 'stack' }
    ];

    var s = new TestStream({ objectMode: true });
    var numIterations = 0;

    var flow = new EnumStream( s, { concurrency: 2 } )
      // Give enough time to have 2 workers at once
      .mapAsync( ( obj, next )=> setTimeout( next.bind( null, null, obj), 20 ) )
      .forEach( ( obj )=>{
        numIterations++;
        if ( numIterations < 4 ){
          assert.equal( flow.numWorkers, 2, 'numWorkers not 2 at ' + numIterations + ' iterations.' );
        }
      })
      .errors( ( error )=>{
        assert( !error );
      })
      .end( ()=>{
        assert.equal( numIterations, 4 );
        done();
      });

      objs.forEach( ( obj, i ) => setTimeout( s.push.bind( s, obj ), i * 5 ) );
      setTimeout( s.push.bind( s, null ), objs.length * 5 );
  });

  it('.reduce()', function( done ){
    var objs = [
      { val: 1 }
    , { val: 2 }
    , { val: 3 }
    , { val: 4 }
    ];

    var s = new TestStream({ objectMode: true });
    var numIterations = 0;

    new EnumStream( s, { concurrency: 1 })
      .reduce( ( result, curr )=> {
        numIterations++;
        return result + curr.val;
      }, 0 )
      .errors( ( error )=>{
        assert( !error );
      })
      .end( reducedValue =>{
        assert.equal( numIterations, 4 );
        assert.equal( reducedValue, 10 );
        done();
      });

      objs.forEach( ( obj, i ) => setTimeout( s.push.bind( s, obj ), i * 5 ) );
      setTimeout( s.push.bind( s, null ), objs.length * 5 );
  });

  it('.reduce() throws', function( done ){
    var objs = [
      { val: 1 }
    , { val: 2 }
    , { val: 3 }
    , { val: 4 }
    ];

    var s = new TestStream({ objectMode: true });
    var numIterations = 0;

    assert.throws( ()=> {
      new EnumStream( s, { concurrency: 1 })
        .reduce( ( result, curr )=> {
          numIterations++;
          return result + curr.val;
        }, 0 )
        .map( result => result )
        .errors( ( error )=>{
          assert( !error );
        })
        .end( reducedValue =>{
          assert.equal( numIterations, 4 );
          assert.equal( reducedValue, 10 );
          done();
        });
    }, EnumStream.InvalidActionError );

    done();
  });
});
