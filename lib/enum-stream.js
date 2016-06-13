'use strict';

class EnumStream {
  static create( stream, options ){
    return new EnumStream( stream, options );
  }

  constructor( stream, options ){
    options = options || {};

    var defaults = {
      concurrency: 1
    };

    for ( var k in defaults ){
      if ( !( k in options ) ) options[ k ] = defaults[ k ];
    }

    for ( k in options ){
      this[ k ] = options[ k ];
    }

    this.stream = stream;
    this.numWorkers = 0;
    this.actions = [];
    this.reducer = null;
    this.errorHandlers = [];
    this.asyncErrorHandlers = [];
    this.endHandlers = [];
    this.processingAsyncErrorHandlers = false;
    this.numRunningAsyncErrorHandlers = 0;
    this.onNumRunningAsyncErrorHandlersEqualsZero = ()=>{};

    this.registerListeners();
  }

  registerListeners(){
    if ( this.stream ){
      this.stream.on( 'data', this.onObject.bind( this ) );
      this.stream.on( 'end', this.callEndHandlersIfNecessary.bind( this ) );
    }
  }

  streamHasEnded(){
    return this.stream._readableState.ended;
  }

  addAction( action ){
    if ( this.reducer ){
      // if ( !(topReducer.initialValue instanceof EnumStream) ){
        throw new InvalidActionError('Cannot add new actions to reduced stream unless reduction results in a new EnumStream');
      // }
    }

    this.actions.push( action );

    return this;
  }

  map( callback ){
    return this.addAction( new EnumStreamActionMap( callback ) );
  }

  mapAsync( callback ){
    return this.addAction( new EnumStreamActionMapAsync( callback ) );
  }

  filter( callback ){
    return this.addAction( new EnumStreamActionFilter( callback ) );
  }

  filterAsync( callback ){
    return this.addAction( new EnumStreamActionFilterAsync( callback ) );
  }

  forEach( callback ){
    return this.addAction( new EnumStreamActionIterate( callback ) );
  }

  reduce( callback, initialValue ){
    this.reducer = new EnumStreamReducer( callback, initialValue );
    return this;
  }

  end( callback ){
    this.endHandlers.push( callback );
    return this;
  }

  errors( callback ){
    this.errorHandlers.push( callback );
    return this;
  }

  errorsAsync( callback ){
    this.asyncErrorHandlers.push( callback );
    return this;
  }

  processActions( obj, callback, actionIdx ){
    if ( !actionIdx ) actionIdx = 0;

    var action = this.actions[ actionIdx ];

    if ( !action || obj instanceof EnumStreamObjectFiltered ){
      return callback( null, obj );
    }

    action.handler( obj, ( error, result )=>{
      if ( error ){
        return callback( error );
      }

      this.processActions( result, callback, ++actionIdx );
    });
  }

  processReducers(){

  }

  callEndHandlersIfNecessary(){
    if ( this.endHandlersCalled ) return;
    if ( this.streamHasEnded() && this.numWorkers === 0 ){
      if ( this.numRunningAsyncErrorHandlers > 0 ){
        return this.onNumRunningAsyncErrorHandlersEqualsZero = ()=>{
          this.callEndHandlersIfNecessary();
        };
      }

      var result = this.reducer ? this.reducer.value : undefined;

      this.endHandlers.forEach( handler => handler( result ) );
      this.endHandlersCalled = true;
    }
  }

  callErrorHandlers( error ){
    this.errorHandlers.forEach( handler => handler( error ) );

    if ( this.asyncErrorHandlers.length > 0 ){
      let onErrorHandler = ()=>{
        if ( --this.numRunningAsyncErrorHandlers === 0 ){
          this.onNumRunningAsyncErrorHandlersEqualsZero();
        }
      };

      this.numRunningAsyncErrorHandlers += this.asyncErrorHandlers.length;
      this.asyncErrorHandlers.forEach( fn => fn( error, onErrorHandler ) );
    }
  }

  onObject( obj ){
    this.numWorkers++;

    if ( this.numWorkers >= this.concurrency ){
      this.stream.pause();
    }

    this.processActions( obj, ( error, result )=>{
      if ( error ){
        this.callErrorHandlers( error );
      }

      if ( this.reducer ){
        this.reducer.handler( obj );
      }

      this.numWorkers--;

      if ( this.stream.isPaused() && this.numWorkers < this.concurrency ){
        this.stream.resume();
      }

      process.nextTick( ()=> this.callEndHandlersIfNecessary() );
    });
  }
}

class EnumStreamActionMap {
  constructor( userHandler ){
    this.userHandler = userHandler;
  }

  handler( obj, next ){
    next( null, this.userHandler( obj ) );
  }
}

class EnumStreamActionMapAsync {
  constructor( userHandler ){
    this.userHandler = userHandler;
  }

  handler( obj, next ){
    this.userHandler( obj, next );
  }
}

class EnumStreamActionFilter {
  constructor( userHandler ){
    this.userHandler = userHandler;
  }

  handler( obj, next ){
    var shouldStayInStream = this.userHandler( obj );

    if ( shouldStayInStream ){
      return next( null, obj );
    }

    return next( null, new EnumStreamObjectFiltered() );
  }
}

class EnumStreamActionFilterAsync {
  constructor( userHandler ){
    this.userHandler = userHandler;
  }

  handler( obj, next ){
    this.userHandler( obj, function( error, shouldStayInStream ){
      if ( error ){
        return next( error );
      }

      if ( shouldStayInStream ){
        return next( null, obj );
      }

      return next( null, new EnumStreamObjectFiltered() );
    });
  }
}

class EnumStreamActionIterate {
  constructor( userHandler ){
    this.userHandler = userHandler;
  }

  handler( obj, next ){
    this.userHandler( obj );
    next( null, obj );
  }
}

class EnumStreamObjectFiltered {}

class EnumStreamReducer {
  constructor( userHandler, initialValue ){
    this.userHandler = userHandler;
    this.value = initialValue;
  }

  handler( obj ){
    this.value = this.userHandler( this.value, obj );
  }
}

class InvalidActionError extends Error {
  constructor( msg ){
    if ( msg ){
      super( msg );
    } else {
      super('Invalid action supplied');
    }
  }
}

EnumStream.EnumStreamActionMap = EnumStreamActionMap;
EnumStream.EnumStreamActionMapAsync = EnumStreamActionMapAsync;
EnumStream.EnumStreamActionFilter = EnumStreamActionFilter;
EnumStream.EnumStreamActionFilterAsync = EnumStreamActionFilterAsync;
EnumStream.EnumStreamActionIterate = EnumStreamActionIterate;
EnumStream.EnumStreamObjectFiltered  = EnumStreamObjectFiltered ;
EnumStream.EnumStreamReducer = EnumStreamReducer;
EnumStream.InvalidActionError = InvalidActionError;

module.exports = EnumStream;
