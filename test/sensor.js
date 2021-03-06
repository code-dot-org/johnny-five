require("./common/bootstrap");

function getShape(sensor) {
  return {
    id: sensor.id,
    custom: sensor.custom,
    mode: sensor.mode,
    freq: sensor.freq,
    range: sensor.range,
    resolution: sensor.resolution,
    limit: sensor.limit,
    threshold: sensor.threshold,
    isScaled: sensor.isScaled,
    pin: sensor.pin,
    state: {
      enabled: sensor.state.enabled,
      booleanBarrier: sensor.state.booleanBarrier,
      scale: sensor.state.scale,
      value: sensor.state.value,
      freq: sensor.state.freq,
    }
  };
}

exports["Sensor - Resolution"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.board = newBoard();
    this.clock = this.sandbox.useFakeTimers();
    this.analogRead = this.sandbox.spy(MockFirmata.prototype, "analogRead");
    // this.sensor = new Sensor({
    //   pin: "A1",
    //   board: this.board
    // });

    done();
  }, // ./setUp: function(done)

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  }, // ./tearDown: function(done)

  defaultBitResolution: function(test) {
    test.expect(1);

    this.sensor = new Sensor({
      pin: "A1",
      board: this.board
    });

    test.equal(this.sensor.resolution, 1023);
    test.done();
  }, // ./defaultBitResolution: function(test)

  ioPluginProvidesBitResolution: function(test) {
    test.expect(1);

    this.board.io.RESOLUTION = {
      ADC: 0xFFF,
    };

    this.sensor = new Sensor({
      pin: "A1",
      board: this.board
    });

    test.equal(this.sensor.resolution, 4095);
    test.done();
  }, // ./ioPluginProvidesBitResolution: function(test)
};

exports["Sensor - Analog"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.board = newBoard();
    this.clock = this.sandbox.useFakeTimers();
    this.analogRead = this.sandbox.spy(MockFirmata.prototype, "analogRead");
    this.sensor = new Sensor({
      pin: "A1",
      board: this.board
    });

    // Complete visible property information expected for the above sensor instance,
    // excluding the 'external' references for the board and io properties.
    this.defShape = {
      id: this.sensor.id,
      custom: {},
      mode: this.sensor.io.MODES.ANALOG,
      freq: 25,
      range: [0, 1023],
      resolution: 1023,
      limit: null,
      threshold: 1,
      isScaled: false,
      pin: 1,
      state: {
        enabled: true,
        booleanBarrier: null,
        scale: null,
        value: 0, // Starts at null, but gets updated before first checks
        freq: 25
      }
    };

    // Methods expected to be found on the prototype for sensor instances
    this.methods = [
      "booleanAt",
      "constructor",
      "enable",
      "disable",
      "scale",
      "scaleTo",
      "fscaleTo",
      "within",
    ];

    // All properties expected to be found (directly) on any sensor instance
    this.members = {
      id: {
        type: "string"
      },
      custom: {
        type: "object"
      },
      pin: {
        type: "number"
      },
      mode: {
        type: "number"
      },
      freq: {
        type: "number"
      },
      range: {
        type: "object"
      },
      resolution: {
        type: "number"
      },
      threshold: {
        type: "number"
      },
      isScaled: {
        type: "boolean"
      },
      raw: {
        type: "object"
      }, // defined property that returns var inited to null
      analog: {
        type: "number"
      }, // defined property
      constrained: {
        type: "number"
      }, // defined property
      boolean: {
        type: "boolean"
      }, // defined property always true or false
      scaled: {
        type: "number"
      }, // defined property
      value: {
        type: "object"
      }, // defined property
      state: {
        type: "object"
      }, // defined (for test mode) property

      board: {
        type: "object"
      },
      io: {
        type: "object"
      },
      limit: {
        type: "object"
      } // null initial value
    };

    done();
  }, // ./setUp: function(done)

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  }, // ./tearDown: function(done)

  instanceof: function(test) {
    test.expect(1);
    test.equal(Sensor({}) instanceof Sensor, true);
    test.done();
  },

  shape: function(test) {
    var propsActual, propsExpected, methodsActual;
    propsActual = Object.getOwnPropertyNames(this.sensor);
    propsExpected = Object.getOwnPropertyNames(this.members);
    methodsActual = Object.getOwnPropertyNames(Object.getPrototypeOf(this.sensor));

    test.expect(3 + 3 * (this.methods.length + propsExpected.length));

    // Verify that all of the expected prototype functions and properties exist for the instance
    this.methods.forEach(function(proto) {
      test.ok(methodsActual.includes(proto), "missing '" + proto + "' sensor prototype method");
    }, this);
    propsExpected.forEach(function(property) {
      test.ok(propsActual.includes(property), "missing '" + property + "' sensor instance property");
    }, this);

    // Make sure that all of the existing instance properties and prototype methods are actually expected, and the correct datatype
    propsActual.forEach(function(property) {
      test.ok(propsExpected.includes(property), "found unexpected '" + property + "' sensor instance member");
      test.ok(propsExpected.includes(property) && typeof this.sensor[property] === this.members[property].type,
        "Unexpected datatype '" + typeof this.sensor[property] + "' found for '" + property + "' property");
    }, this);
    methodsActual.forEach(function(proto) {
      test.ok(this.methods.includes(proto), "found unexpected '" + proto + "' sensor prototype method");
      test.strictEqual(typeof this.sensor[proto], "function", "Unexected datatype found for '" + proto + "' method");
    }, this);

    // Check that the 'standard' component properties reference the expected objects
    test.strictEqual(this.sensor.board, this.board, "Expected to be the mock board");
    test.strictEqual(this.sensor.io, this.board.io, "Expected to be the same io as the mock board");
    // See if the visible instance properties match the expected default values
    test.deepEqual(getShape(this.sensor), this.defShape, "sensor instance properties should match default shape values");

    test.done();
  }, // ./shape: function(test)

  emitter: function(test) {
    test.expect(1);

    test.ok(this.sensor instanceof Emitter);

    test.done();
  }, // ./emitter: function(test)

  data: function(test) {
    var tickAccum, tickDelta, spy = this.sandbox.spy();
    test.expect(4);

    // Make sure that no event is emitted before the end of the initial interval is reached
    this.sensor.on("data", spy);
    tickAccum = 0;
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // accumulated (elapsed) time is one tick (ms) before the end of the first interval
    tickAccum += tickDelta;
    test.ok(!spy.called, "tick " + tickAccum + ": data event handler should not be called until tick " + this.defShape.freq);

    // Make sure that an event is emitted when the initial interval ends
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the first (freq) interval
    tickAccum += tickDelta;
    test.ok(spy.calledOnce, "tick " + tickAccum + ": data event handler should have been called first time at tick " + this.defShape.freq);

    // Make sure no additional event is emitted before the end of the next interval
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now one tick before the end of the second interval
    tickAccum += tickDelta;
    test.ok(spy.calledOnce, "tick" + tickAccum + ": data event handler should not be called again until tick " + (this.defShape.freq * 2));

    // Make sure the next event is emitted at the end of the second interval
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the second interval
    tickAccum += tickDelta;
    test.ok(spy.calledTwice, "tick " + tickAccum + ": data event handler should be called second time at tick " + (this.defShape.freq * 2));

    test.done();
  }, // ./data: function(test)

  filtered: function(test) {
    var callback = this.analogRead.args[0][1],
      dataSpy = this.sandbox.spy(),
      chgSpy = this.sandbox.spy(),
      tickDelta, tickAccum, spyCall, raw, filtered;
    test.expect(37);

    this.sensor.on("data", dataSpy);
    this.sensor.on("change", chgSpy);

    // Check that the default noise filtering calculates the median value, while the individual reads track the raw values
    tickAccum = 0;
    raw = 100;
    callback(raw);
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum + ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum + ": sensor value property expected to be the last value (" + raw + ") injected");
    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 102;
    callback(raw);
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum + ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum + ": sensor value property expected to be the last value (" + raw + ") injected");
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 101;
    callback(raw);
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum + ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum + ": sensor value property expected to be the last value (" + raw + ") injected");
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 103;
    callback(raw);
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum + ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum + ": sensor value property expected to be the last value (" + raw + ") injected");
    tickDelta = this.defShape.freq - tickAccum - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now 1 tick (ms) before the end of the first (freq) event throttling interval
    tickAccum += tickDelta;
    raw = 104;
    callback(raw);
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum + ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum + ": sensor value property expected to be the last value (" + raw + ") injected");
    test.ok(!dataSpy.called, "tick " + tickAccum + ": data event handler should not be called until tick " + this.defShape.freq);
    test.ok(!chgSpy.called, "tick " + tickAccum + ": change event handler should not be called until tick " + this.defShape.freq);

    // Make sure that the events are emitted, with the median of the raw read values, at the end of the interval
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the first (freq) event throttling interval
    tickAccum += tickDelta;
    // Median of values sent through callback since previous data event
    filtered = 102;
    test.ok(dataSpy.calledOnce, "tick " + tickAccum + ": data event handler should be called at tick " + this.defShape.freq);
    test.ok(chgSpy.calledOnce, "tick " + tickAccum + ": change event handler should be called at tick " + this.defShape.freq);
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum + ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum + ": sensor value property expected to be the last value (" + raw + ") injected");
    // Check the arguments and context provided for the emitted events
    spyCall = dataSpy.getCall(0);
    test.strictEqual(spyCall.args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor), "data event 'this' parameter expected to be source sensor object");
    spyCall = chgSpy.getCall(0);
    test.strictEqual(spyCall.args[0], filtered, "change event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor), "change event 'this' parameter expected to be source sensor object");

    // Check for non-integer median value (when even number of data points and odd delta between middle two)
    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    callback(202);
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    callback(206);
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    callback(201);
    tickDelta = this.defShape.freq * 2 - tickAccum - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now 1 tick before the end of the second interval
    tickAccum += tickDelta;
    raw = 203;
    callback(raw);
    // Check that no event is emitted before the end of the next interval
    test.ok(dataSpy.calledOnce, "tick " + tickAccum + ": data event handler should not be called again until tick " + this.defShape.freq * 2);
    test.ok(chgSpy.calledOnce, "tick " + tickAccum + ": change event handler should not be called again until tick " + this.defShape.freq * 2);
    filtered = 202.5; // Round median of values sent through callback (last === 102) (avg(102,103))

    // Check that events are emitted at the end of the second interval
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the second event throttling interval
    tickAccum += tickDelta;
    test.ok(dataSpy.calledTwice, "tick " + tickAccum + ": data event handler should be called again at tick " + this.defShape.freq * 2);
    test.ok(chgSpy.calledTwice, "tick " + tickAccum + ": change event handler should be called again at tick " + this.defShape.freq * 2);
    test.strictEqual(this.sensor.raw, raw, "sensor raw property expected to be the last value (" + raw + ") read (injected)");
    test.strictEqual(this.sensor.value, raw, "sensor value property expected to be the last value (" + raw + ") read (injected)");

    // Check that both events provide the correct median value and context
    spyCall = dataSpy.getCall(1);
    test.strictEqual(spyCall.args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor), "data event 'this' parameter expected to be source sensor object");
    spyCall = chgSpy.getCall(1);
    test.strictEqual(spyCall.args[0], filtered, "change event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor), "change event 'this' parameter expected to be source sensor object");

    // Check that no events are emitted before the end of the next throttling interval
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now 1 tick before the end of the third interval
    tickAccum += tickDelta;
    test.ok(dataSpy.calledTwice, "tick " + tickAccum + ": data event handler should not be called again until tick " + this.defShape.freq * 3);
    test.ok(chgSpy.calledTwice, "tick " + tickAccum + ": change event handler should not be called again until at least tick " + this.defShape.freq * 3);

    // check that only the data event is emitted when no new values are read during the interval
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the third interval
    tickAccum += tickDelta;
    test.ok(dataSpy.calledThrice, "tick " + tickAccum + ": data event handler should be called again at tick " + this.defShape.freq * 3);
    test.ok(chgSpy.calledTwice, "tick " + tickAccum + ": change event handler should not be called at " + this.defShape.freq * 3 + " without new value");
    test.strictEqual(this.sensor.raw, raw, "sensor raw property expected to be the last value (" + raw + ") read (injected)");
    test.strictEqual(this.sensor.value, raw, "sensor value property expected to be the last value (" + raw + ") read (injected)");
    // Check that the data event has the same filtered value as the previous event
    spyCall = dataSpy.getCall(2);
    test.strictEqual(spyCall.args[0], filtered, "data event value expected to be still the median (" + filtered + ") value");

    test.done();
  }, // ./filtered: function(test)

  change: function(test) {
    var callback = this.analogRead.args[0][1],
      spy = this.sandbox.spy(),
      tickAccum, tickDelta, chgValue;
    test.expect(8);

    this.sensor.on("change", spy);

    // Make sure that no change event is emitted before the end of the first (freq) throttling interval
    tickAccum = 0;
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // accumulated (elapsed) time is one tick (ms) before the end of the first interval
    tickAccum += tickDelta;
    chgValue = 1023;
    callback(chgValue);
    // Reading a data value should not (immediately) cause an event to be emitted
    test.ok(!spy.called, "tick " + tickAccum + ": change event handler should not be called until tick " + this.defShape.freq);

    // Make sure that a change event is emitted at the end of the throttling interval
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed (fake) time is at the end of the first (event throttling) interval
    tickAccum += tickDelta;
    test.ok(spy.calledOnce, "tick " + tickAccum + ": change event handler should have been called first time at tick " + this.defShape.freq);
    test.strictEqual(spy.getCall(0).args[0], chgValue, "first change event value expected to be " + chgValue);

    // Make sure that no change event is emitted before the end of the next throttling interval
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is one tick before the end of the second throttling interval
    tickAccum += tickDelta;
    // duplicate of previous data value
    chgValue = 1023;
    callback(chgValue);
    test.ok(spy.calledOnce, "tick " + tickAccum + ": change event handler should not be called again until at least tick " + this.defShape.freq * 2);

    // Make sure that no change event is emitted when the reading does not change
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the second event throttling interval
    tickAccum += tickDelta;
    test.ok(spy.calledOnce, "tick " + tickAccum + ": change event handler should not be called without a new data value");

    // Make sure that no change event is emitted before the end of the next throttling interval
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    // different value
    chgValue = 512;
    callback(chgValue);
    test.ok(spy.calledOnce, "tick" + tickAccum + ": change event handler should not be called again until tick " + (this.defShape.freq * 3));

    // Make sure that a different (greater than threshold) value change emits a new change event
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the third event throttling interval
    tickAccum += tickDelta;
    test.ok(spy.calledTwice, "tick " + tickAccum + ": change event handler should be called second time at tick " + (this.defShape.freq * 3));
    test.strictEqual(spy.getCall(1).args[0], chgValue, "second change event value expected to be " + chgValue);

    test.done();
  }, // ./change: function(test)

  // Tests to check that the thresholds are handled correctly to control when change events get emitted
  threshold: function(test) {
    var callback = this.analogRead.args[0][1],
      spy = this.sandbox.spy(),
      tickDelta, tickAccum, spyCall, raw, filtered, newShape;
    test.expect(45);

    this.sensor.on("change", spy);

    test.strictEqual(this.sensor.threshold, 1, "Following tests assume a (default) threshold of 1");

    tickAccum = 0;
    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    // An initial reference value to base threshold checks against
    raw = 512;
    filtered = raw; // last value = null
    callback(raw);

    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the first (freq) event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    // Change event should always be triggered after first interval (at tick this.defShape.freq)
    test.strictEqual(spy.callCount, 1, "tick " + tickAccum +
      ": change event handler should be called first time at tick " + this.defShape.freq);

    // Verify the arguments and context for the call to the event handler
    spyCall = spy.getCall(0);
    test.strictEqual(spyCall.args[0], filtered,
      "change event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor),
      "change event 'this' parameter expected to be source sensor object");

    // Check that no new change event is emitted when the (filtered) value changes (up) by (just) less than the threshold
    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 512;
    callback(raw);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 513;
    // last filtered value = 512
    filtered = 512.5;
    callback(raw);

    tickDelta = this.defShape.freq - 2;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the second event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 1, "tick " + tickAccum +
      ": change event handler should not be called at tick " + this.defShape.freq * 2 + "; new median within threshold");

    // Check that a change event is emitted when the new filtered value is right on the threshold boundary
    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 511;
    // last emitted value = 512
    filtered = raw;
    callback(raw);

    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the third event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 2, "tick " + tickAccum +
      ": change event handler should be called at tick " + this.defShape.freq * 3 + "; new median on threshold boundary");

    // Verify the arguments and context for the call to the event handler
    spyCall = spy.getCall(1);
    test.strictEqual(spyCall.args[0], filtered, "change event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor), "change event 'this' parameter expected to be source sensor object");

    // Check that no new change event is emitted when the (filtered) value changes (down) by (just) less than the threshold
    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 500;
    callback(raw);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 521;
    // last emitted value = 511
    filtered = 510.5;
    callback(raw);

    tickDelta = this.defShape.freq - 2;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the fourth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 2, "tick " + tickAccum +
      ": change event handler should not be called at tick " + this.defShape.freq * 4);

    // Check that setting a new threshold property value changes the boundaries for when change events are emitted
    newShape = Fn.cloneDeep(this.defShape);
    newShape.threshold = 0.5;
    // Any (normal) change should trigger a change event
    this.sensor.threshold = newShape.threshold;
    // Setting a new threshold value should change (only) the threshold property of the instance
    test.deepEqual(newShape, getShape(this.sensor), "sensor instance properties should match new shape values");

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 511;
    // last emitted value = 511
    filtered = raw;
    callback(raw);

    // Check that no new event is emitted when the filtered value does not change
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the fifth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 2, "tick " + tickAccum +
      ": change event handler should not be called at tick " + this.defShape.freq * 5 + "; new median same as last");

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 501;
    callback(raw);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 522;
    // last emitted value = 511
    filtered = 511.5;
    callback(raw);

    // Check that a change event is emitted with a filtered value on the new upper threshold boundary
    tickDelta = this.defShape.freq - 2;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the sixth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 3, "tick " + tickAccum +
      ": change event handler should be called at tick " + this.defShape.freq * 6 + "; on threshold boundary");

    // Verify the arguments and context for the call to the event handler
    spyCall = spy.getCall(2);
    test.strictEqual(spyCall.args[0], filtered, "change event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor), "change event 'this' parameter expected to be source sensor object");

    // Only changes of 10 or more should trigger a change event
    newShape.threshold = 10;
    this.sensor.threshold = newShape.threshold;
    test.deepEqual(newShape, getShape(this.sensor), "sensor instance properties should match new shape values");

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 520;
    callback(raw);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 522;
    // last emitted value = 511.5
    filtered = 521;
    callback(raw);

    // Check that upward changes of (just) less than the new threshold do not emit a change event
    tickDelta = this.defShape.freq - 2;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the seventh event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 3, "tick " + tickAccum +
      ": change event handler should not be called at tick " + this.defShape.freq * 7 + "; median change less than threshold");

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 497;
    callback(raw);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 507;
    // last emitted value = 511.5
    filtered = 502;
    callback(raw);

    // Check that downward changes of (just) less than the new threshold do not emit a change event
    tickDelta = this.defShape.freq - 2;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the eighth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 3, "tick " + tickAccum +
      ": change event handler should not be called at tick " + this.defShape.freq * 8 + " since change does not exceed threshold");

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 520;
    callback(raw);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    raw = 527;
    // last emitted value = 511.5
    filtered = 523.5;
    callback(raw);

    // Check that changes above the (upper) threshold emit a change event
    tickDelta = this.defShape.freq - 2;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the ninth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 4, "tick " + tickAccum +
      ": change event handler should be called at tick " + this.defShape.freq * 9 + " since change threshold exceeded");

    // Verify the arguments and context for the call to the event handler
    spyCall = spy.getCall(3);
    test.strictEqual(spyCall.args[0], filtered, "change event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor), "change event 'this' parameter expected to be source sensor object");

    // do a new read at the end of the current interval, after the event has been emitted.
    raw = 515;
    callback(raw);
    // last emitted value = 523.5
    filtered = 515;

    // Check that a downward change of less than the current threshold does not emit a change event
    tickDelta = this.defShape.freq;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the tenth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(this.sensor.raw, raw, "tick " + tickAccum +
      ": sensor raw property expected to be the last value (" + raw + ") injected");
    test.strictEqual(this.sensor.value, raw, "tick " + tickAccum +
      ": sensor value property expected to be the last value (" + raw + ") injected");
    test.strictEqual(spy.callCount, 4, "tick " + tickAccum +
      ": change event handler should not be called at tick " + this.defShape.freq * 10 + " since change does not exceed threshold");

    // Changes of 5 or more should trigger a change event
    newShape.threshold = 5;
    this.sensor.threshold = newShape.threshold;
    test.deepEqual(newShape, getShape(this.sensor), "sensor instance properties should match new shape values");

    tickDelta = this.defShape.freq;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the eleventh event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 5, "tick " + tickAccum +
      ": change event handler should be called at tick " + this.defShape.freq * 11 +
      "; changed threshold moves existing filtered value outside range");

    // Verify the arguments and context for the call to the event handler
    spyCall = spy.getCall(4);
    test.strictEqual(spyCall.args[0], filtered, "change event value expected to be the median (" + filtered + ") value");
    test.ok(spyCall.calledOn(this.sensor), "change event 'this' parameter expected to be source sensor object");

    test.done();
  }, // ./threshold: function(test)


  thresholdExplicit: function(test) {
    this.sensor = new Sensor({
      pin: "A2",
      board: this.board,
      threshold: 5,
    });

    test.expect(1);
    test.strictEqual(this.sensor.threshold, 5);
    test.done();
  }, // ./thresholdExplicit: function(test)


  id: function(test) {
    var newShape, newId;
    test.expect(3);

    newShape = Fn.cloneDeep(this.defShape);
    newId = "test sensor id";
    newShape.id = newId;
    this.sensor.id = newId;
    test.deepEqual(newShape, getShape(this.sensor), "sensor instance properties should match shape with new id");

    newId = "1234";
    this.sensor.id = newId;
    test.strictEqual(this.sensor.id, newId, "id specified as string \"1234\"");

    newId = 1234;
    this.sensor.id = newId;
    test.strictEqual(this.sensor.id, newId, "id specified as numeric 1234");

    test.done();
  }, // ./id: function(test)

  limit: function(test) {
    var callback = this.analogRead.args[0][1],
      dataSpy = this.sandbox.spy(),
      limitSpy = this.sandbox.spy(),
      lowerSpy = this.sandbox.spy(),
      upperSpy = this.sandbox.spy(),
      newShape, raw, filtered, tickDelta, tickAccum, lowerLimit, upperLimit;
    test.expect(46);
    this.sensor.on("data", dataSpy);
    this.sensor.on("limit", limitSpy);
    this.sensor.on("limit:lower", lowerSpy);
    this.sensor.on("limit:upper", upperSpy);

    test.strictEqual(this.sensor.limit, null, "sensor limit property should default to null value");

    // Check that no limit events are emitted while no limit is configured (low value)
    tickAccum = 0;
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now 1 tick before the end of the first event throttling interval
    tickAccum += tickDelta;
    raw = 0;
    filtered = raw;
    callback(raw);
    test.strictEqual(dataSpy.callCount + limitSpy.callCount + lowerSpy.callCount + upperSpy.callCount, 0,
      "tick " + tickAccum + ": no event handlers should not be called until tick " + this.defShape.freq);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the first event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(dataSpy.callCount, 1, "tick " + tickAccum +
      ": data event handler should be called first time at tick " + this.defShape.freq);
    test.strictEqual(dataSpy.getCall(0).args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.strictEqual(limitSpy.callCount + lowerSpy.callCount + upperSpy.callCount, 0,
      "tick " + tickAccum + ": no limit event handlers should be called while limit is null");

    // Check that no limit events are emitted while no limit is configured (high value)
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now 1 tick before the end of the second event throttling interval
    tickAccum += tickDelta;
    raw = 1023;
    filtered = raw;
    callback(raw);
    test.strictEqual(dataSpy.callCount + limitSpy.callCount + lowerSpy.callCount + upperSpy.callCount, 1,
      "tick " + tickAccum + ": no more event handlers should not be called until tick " + this.defShape.freq * 2);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the second event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(dataSpy.callCount, 2, "tick " + tickAccum +
      ": data event handler should be called again time at tick " + this.defShape.freq * 2);
    test.strictEqual(dataSpy.getCall(1).args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.strictEqual(limitSpy.callCount + lowerSpy.callCount + upperSpy.callCount, 0,
      "tick " + tickAccum + ": no limit event handlers should be called while limit is null");

    newShape = Fn.cloneDeep(this.defShape);
    // test.deepEqual(this.defShape, newShape);//DBG verify that deep copy is working
    // test.deepStrictEqual(this.defShape, newShape);//DBG verify that deep copy is working
    // newShape.limit = "junk";
    // newShape.limit = {test: "junk"};
    // newShape.limit = {0: "junk"};
    // newShape.limit = 123;

    // Check that setting limit boundaries changes the instance shape to match
    lowerLimit = 0;
    upperLimit = 1023;
    newShape.limit = [lowerLimit, upperLimit];
    this.sensor.limit = [lowerLimit, upperLimit];
    test.deepEqual(getShape(this.sensor), newShape, "sensor instance properties should match shape with new limit");

    lowerLimit = 100;
    upperLimit = 101;
    newShape.limit = [lowerLimit, upperLimit];
    this.sensor.limit = [lowerLimit, upperLimit];
    test.deepEqual(getShape(this.sensor), newShape, "sensor instance properties should match shape with new limit");

    lowerLimit = 450;
    upperLimit = 550;
    newShape.limit = [lowerLimit, upperLimit];
    this.sensor.limit = [lowerLimit, upperLimit];
    test.deepEqual(getShape(this.sensor), newShape, "sensor instance properties should match shape with new limit");

    // Check that a value just above the lower limit does not emit any limit events
    raw = 450;
    callback(raw);

    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now 1 tick before the end of the third event throttling interval
    tickAccum += tickDelta;
    raw = 451;
    filtered = 450.5;
    callback(raw);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the third event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(dataSpy.callCount, 3, "tick " + tickAccum +
      ": data event handler should be called every multiple of " + this.defShape.freq + " ticks");
    test.strictEqual(dataSpy.getCall(2).args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.strictEqual(limitSpy.callCount + lowerSpy.callCount + upperSpy.callCount, 0,
      "tick " + tickAccum + ": no limit event handlers should be called while value is within the limits");

    // Check that a value just above the lower limit does not emit any limit events
    raw = 550;
    callback(raw);

    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // elapsed time is now 1 tick before the end of the fourth event throttling interval
    tickAccum += tickDelta;
    raw = 549;
    filtered = 549.5;
    callback(raw);

    tickDelta = 1;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the fourth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(dataSpy.callCount, 4, "tick " + tickAccum +
      ": data event handler should be called every multiple of " + this.defShape.freq + " ticks");
    test.strictEqual(dataSpy.getCall(3).args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.strictEqual(limitSpy.callCount + lowerSpy.callCount + upperSpy.callCount, 0,
      "tick " + tickAccum + ": no limit event handlers should be called while value is within the limits");

    // check that a value matching the lower limit emits limit and limit:lower events
    raw = 450;
    filtered = raw;
    callback(raw);
    tickDelta = this.defShape.freq;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the fifth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(dataSpy.callCount, 5, "tick " + tickAccum +
      ": data event handler should be called every multiple of " + this.defShape.freq + " ticks");
    test.strictEqual(limitSpy.callCount, 1, "tick " + tickAccum +
      ": limit event handler should be called at " + this.defShape.freq + " ticks; value at lower limit");
    test.strictEqual(lowerSpy.callCount, 1, "tick " + tickAccum +
      ": limit:lower event handler should be called at " + this.defShape.freq + " ticks; value at lower limit");
    test.strictEqual(upperSpy.callCount, 0, "tick " + tickAccum +
      ": limit:upper event handler should not be called at " + this.defShape.freq + " ticks; value at lower limit");
    test.strictEqual(dataSpy.getCall(4).args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.deepEqual(limitSpy.getCall(0).args[0], {
        boundary: "lower",
        value: filtered
      },
      "limit event value expected to be the lower boundary with the median (" + filtered + ") value");
    test.strictEqual(lowerSpy.getCall(0).args[0], filtered, "limit:lower event value expected to be the median (" + filtered + ") value");

    // check that a value matching the upper limit emits limit and limit:upper events
    raw = 550;
    filtered = raw;
    callback(raw);
    tickDelta = this.defShape.freq;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the sixth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(dataSpy.callCount, 6, "tick " + tickAccum +
      ": data event handler should be called every multiple of " + this.defShape.freq + " ticks");
    test.strictEqual(limitSpy.callCount, 2, "tick " + tickAccum +
      ": limit event handler should be called at " + this.defShape.freq + " ticks; value at upper limit");
    test.strictEqual(lowerSpy.callCount, 1, "tick " + tickAccum +
      ": limit:lower event handler should not be called at " + this.defShape.freq + " ticks; value at upper limit");
    test.strictEqual(upperSpy.callCount, 1, "tick " + tickAccum +
      ": limit:upper event handler should be called at " + this.defShape.freq + " ticks; value at upper limit");
    test.strictEqual(dataSpy.getCall(5).args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.deepEqual(limitSpy.getCall(1).args[0], {
        boundary: "upper",
        value: filtered
      },
      "limit event value expected to be the lower boundary with the median (" + filtered + ") value");
    test.strictEqual(upperSpy.getCall(0).args[0], filtered, "limit:upper event value expected to be the median (" + filtered + ") value");

    // check that a very low value emits limit and limit:lower events
    raw = 0;
    filtered = raw;
    callback(raw);
    tickDelta = this.defShape.freq;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the seventh event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(dataSpy.callCount, 7, "tick " + tickAccum +
      ": data event handler should be called every multiple of " + this.defShape.freq + " ticks");
    test.strictEqual(limitSpy.callCount, 3, "tick " + tickAccum +
      ": limit event handler should be called at " + this.defShape.freq + " ticks; value at lower limit");
    test.strictEqual(lowerSpy.callCount, 2, "tick " + tickAccum +
      ": limit:lower event handler should be called at " + this.defShape.freq + " ticks; value at lower limit");
    test.strictEqual(upperSpy.callCount, 1, "tick " + tickAccum +
      ": limit:upper event handler should not be called at " + this.defShape.freq + " ticks; value at lower limit");
    test.strictEqual(dataSpy.getCall(6).args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.deepEqual(limitSpy.getCall(2).args[0], {
        boundary: "lower",
        value: filtered
      },
      "limit event value expected to be the lower boundary with the median (" + filtered + ") value");
    test.strictEqual(lowerSpy.getCall(1).args[0], filtered, "limit:lower event value expected to be the median (" + filtered + ") value");

    // check that a very high value emits limit and limit:upper events
    raw = 1023;
    filtered = raw;
    callback(raw);
    tickDelta = this.defShape.freq;
    this.clock.tick(tickDelta);
    // elapsed time is now at the end of the eighth event throttling interval
    tickAccum += tickDelta;
    test.strictEqual(dataSpy.callCount, 8, "tick " + tickAccum +
      ": data event handler should be called every multiple of " + this.defShape.freq + " ticks");
    test.strictEqual(limitSpy.callCount, 4, "tick " + tickAccum +
      ": limit event handler should be called at " + this.defShape.freq + " ticks; value at upper limit");
    test.strictEqual(lowerSpy.callCount, 2, "tick " + tickAccum +
      ": limit:lower event handler should not be called at " + this.defShape.freq + " ticks; value at upper limit");
    test.strictEqual(upperSpy.callCount, 2, "tick " + tickAccum +
      ": limit:upper event handler should be called at " + this.defShape.freq + " ticks; value at upper limit");
    test.strictEqual(dataSpy.getCall(7).args[0], filtered, "data event value expected to be the median (" + filtered + ") value");
    test.deepEqual(limitSpy.getCall(3).args[0], {
        boundary: "upper",
        value: filtered
      },
      "limit event value expected to be the lower boundary with the median (" + filtered + ") value");
    test.strictEqual(upperSpy.getCall(1).args[0], filtered, "limit:upper event value expected to be the median (" + filtered + ") value");

    test.done();
  }, // ./limit: function(test)

  freq: function(test) {
    var spy = this.sandbox.spy(),
      newShape, newFreq, tickDelta, tickAccum;
    test.expect(10);

    this.sensor.on("data", spy);
    test.deepEqual(this.defShape, getShape(this.sensor), "sensor instance properties should match default shape values");

    // Make sure that the data event does not get emitted (first time) until the initial (default)
    // interval (currently 25 ms === 25 ticks) has passed.
    tickAccum = 0;
    // One less tick than the expected time to emit a data event
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 0, "tick " + tickAccum +
      ": data event handler should not be called first time until tick " + this.defShape.freq);
    // As above, many message in this (and other) test start with the accumluated (tick) time, then have
    // another time at the end.  The first is the actual (fake) elapsed time.  The second is the the time
    // point boundary being used as a reference.  Have both simplifies debugging the testing code, to get
    // the specified time deltas correct.

    // Make sure that a data event does get emitted at the time specified by the initial (default)
    // freq interval.
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // Acumulated ticks are now up to the default freq interval
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 1, "tick " + tickAccum +
      ": data event handler should be called first time at tick " + this.defShape.freq);

    // After explicitly setting the frep property value of the existing instance, the shape (properties)
    // of the instance should match the default shape, with (only) the freq property value and the
    // clone in the state information, updated to match the specified value.
    newShape = Fn.cloneDeep(this.defShape);
    newFreq = 35;
    newShape.freq = newFreq;
    newShape.state.freq = newFreq;
    this.sensor.freq = newFreq;
    test.deepEqual(getShape(this.sensor), newShape,
      "sensor instance properties should match shape with new freq");

    // Make sure that the next (and following) emitted data events are based on the new interval
    // new interval is larger than the original, so first check is that no event is emitted at the
    // initial interval: check just before, then again at the old interval time point.
    tickDelta = this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 1, "tick " + tickAccum +
      ": data event handler should not be called second time until tick " + (this.defShape.freq + newFreq));

    tickDelta = 1;
    this.clock.tick(tickDelta);
    // Accumulated ticks are now up to 2 times the initial freq interval value
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 1, "tick " + tickAccum +
      ": data event handler should not be called second time until tick " + (this.defShape.freq + newFreq));
    // The above 2 checks are not needed to check for correct operation.  They are helpful when
    // something is wrong to narrow down where the problem is likely to be.

    // Check that no new event has been emitted one time step (tick) before it is expected to be emitted;
    tickDelta = newFreq - this.defShape.freq - 1;
    this.clock.tick(tickDelta);
    // Accumulated ticks are now up to 1 before the new interval ms after the new interval was set.
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 1, "tick " + tickAccum +
      ": data event handler should not be called second time until tick " + (this.defShape.freq + newFreq));

    // Make sure that a new data event is emitted after the (new) specifed interval has passed
    tickDelta = 1;
    this.clock.tick(tickDelta);
    // Accumulated ticks are now up to (at) the new inteval after the new interval was set.
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 2, "tick " + tickAccum +
      ": data event handler should be called second time at tick " + (this.defShape.freq + newFreq));

    // Make sure that no new event is emitted before the end of the next (new) interval
    tickDelta = newFreq - 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 2, "tick " + tickAccum +
      ": data event handler should not be called third time until tick " + (this.defShape.freq + 2 * newFreq));

    // Make sure that a new event is emitted at the end of the next (new) interval
    tickDelta = 1;
    this.clock.tick(tickDelta);
    tickAccum += tickDelta;
    test.strictEqual(spy.callCount, 3, "tick " + tickAccum +
      ": data event handler should be called third time at tick " + (this.defShape.freq + 2 * newFreq));

    test.done();
  }, // ./freq: function(test)

  scale: function(test) {
    var callback = this.analogRead.args[0][1];

    test.expect(3);

    // Scale the expected 0-1023 to a value between 50-100 (~75)
    this.sensor.scale(50, 100);

    this.sensor.once("change", function() {
      test.equal(this.value, 100);
    });
    callback(1023);
    this.clock.tick(25);

    this.sensor.once("change", function() {
      test.equal(this.value, 50);
    });
    callback(0);
    this.clock.tick(25);

    // Ensure sensors may return float values
    this.sensor.scale([0, 102.3]);
    this.sensor.once("change", function() {
      // Code.org: Scaled sensor values are rounded
      test.equal(this.value, 1);
    });
    callback(12);
    this.clock.tick(25);

    test.done();
  }, // ./scale: function(test)


  scaleTo: function(test) {
    var callback = this.analogRead.args[0][1];

    test.expect(4);

    this.sensor.once("change", function() {
      test.equal(this.scaleTo([50, 100]), 100);
    });
    callback(1023);
    this.clock.tick(25);

    this.sensor.once("change", function() {
      test.equal(this.scaleTo(50, 100), 50);
    });
    callback(0);
    this.clock.tick(25);

    // Ensure sensors may return float values
    this.sensor.scale([0, 102.3]);
    this.sensor.once("change", function() {
      test.equal(this.fscaleTo([0, 102.3]), 1.2000000476837158);
      test.equal(this.fscaleTo(0, 102.3), 1.2000000476837158);
    });
    callback(12);
    this.clock.tick(25);

    test.done();
  }, // ./scaleTo: function(test)


  within: function(test) {
    var callback = this.analogRead.args[0][1];

    test.expect(1);

    // While the sensor value is between the given values,
    // invoke the registered handler.
    this.sensor.within([400, 600], function() {
      test.equal(this.value, 500);
    });

    callback(1023);
    this.clock.tick(25);
    callback(500);
    this.clock.tick(25);
    callback(0);
    this.clock.tick(25);

    test.done();
  }, // ./within: function(test)

  booleanAt: function(test) {
    var callback = this.analogRead.args[0][1],
      expected = false;
    test.expect(4);

    // Default of 50% (512)

    this.sensor.on("data", function() {
      test.equals(this.boolean, expected);
    });

    callback(500);
    this.clock.tick(25);
    expected = true;
    callback(600);
    this.clock.tick(25);

    // Explicit value

    this.sensor.booleanAt(768);
    expected = false;
    callback(760);
    this.clock.tick(25);
    expected = true;
    callback(780);
    this.clock.tick(25);

    test.done();
  }, // ./booleanAt: function(test)

  scaledBooleanAt: function(test) {
    var callback = this.analogRead.args[0][1],
      expected = false;
    test.expect(4);

    this.sensor.scale(100, 200);

    // Default of 50% (150)

    this.sensor.on("data", function() {
      test.equals(this.boolean, expected);
    });

    callback(500);
    this.clock.tick(25);
    expected = true;
    callback(600);
    this.clock.tick(25);

    // Explicit value

    this.sensor.booleanAt(175);
    expected = false;
    callback(760);
    this.clock.tick(25);
    expected = true;
    callback(780);
    this.clock.tick(25);

    test.done();
  },

  constrained: function(test) {
    var callback = this.analogRead.args[0][1];
    test.expect(1);

    this.sensor.on("data", function() {
      test.equals(this.constrained, 255);
    });

    callback(1023);
    this.clock.tick(25);
    test.done();
  },

  analog: function(test) {
    var callback = this.analogRead.args[0][1];

    test.expect(3);

    callback(1023);
    test.equals(this.sensor.analog, 255);

    callback(0);
    test.equals(this.sensor.analog, 0);

    callback(512);
    test.equals(this.sensor.analog, 127);

    test.done();
  }, // ./analog: function(test)

  disable: function(test) {
    var callback = this.analogRead.args[0][1];
    var spy = this.sandbox.spy();

    test.expect(1);

    this.sensor.disable();

    this.sensor.on("data", spy);
    this.sensor.on("change", spy);

    callback(1023);
    this.clock.tick(25);
    callback(1023);
    this.clock.tick(25);
    callback(1023);
    this.clock.tick(25);
    callback(1023);
    this.clock.tick(25);
    callback(1023);
    this.clock.tick(25);

    test.equal(spy.callCount, 0);

    test.done();
  },

  enable: function(test) {
    var callback = this.analogRead.args[0][1];
    var spy = this.sandbox.spy();

    test.expect(2);

    this.sensor.disable();

    this.sensor.on("data", spy);
    this.sensor.on("change", spy);

    callback(1023);
    this.clock.tick(25);

    test.equal(spy.callCount, 0);

    this.sensor.enable();

    callback(1023);
    this.clock.tick(25);

    test.equal(spy.callCount, 2);
    test.done();
  },

  enableFalse: function(test) {

    this.sensor = new Sensor({
      pin: "A2",
      board: this.board,
      enabled: false,
    });

    var callback = this.analogRead.args[0][1];
    var spy = this.sandbox.spy();

    test.expect(1);

    this.sensor.on("data", spy);
    this.sensor.on("change", spy);

    this.sensor.enable();

    callback(1023);
    this.clock.tick(25);

    test.equal(spy.callCount, 2);
    test.done();
  }
};

exports["Sensor - Digital"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.board = newBoard();
    this.clock = this.sandbox.useFakeTimers();
    this.digitalRead = this.sandbox.spy(MockFirmata.prototype, "digitalRead");
    this.sensor = new Sensor({
      type: "digital",
      pin: 3,
      board: this.board
    });

    this.proto = [{
      name: "scale"
    }, {
      name: "scaleTo"
    }, {
      name: "booleanAt"
    }, {
      name: "within"
    }];

    this.instance = [{
      name: "id"
    }, {
      name: "pin"
    }, {
      name: "mode"
    }, {
      name: "freq"
    }, {
      name: "range"
    }, {
      name: "threshold"
    }, {
      name: "isScaled"
    }, {
      name: "raw"
    }, {
      name: "analog"
    }, {
      name: "constrained"
    }, {
      name: "boolean"
    }, {
      name: "scaled"
    }, {
      name: "value"
    }, ];

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  digital: function(test) {
    var callback = this.digitalRead.args[0][1],
      change = this.sandbox.spy(),
      data = this.sandbox.spy();

    test.expect(4);

    this.sensor.on("data", data);
    this.sensor.on("change", change);

    callback(1);
    this.clock.tick(25);
    callback(0);
    this.clock.tick(25);

    test.equal(data.getCall(0).args[0], 1);
    test.equal(data.getCall(1).args[0], 0);

    test.equal(change.getCall(0).args[0], 1);
    test.equal(change.getCall(1).args[0], 0);
    test.done();
  },

  data: function(test) {
    var data = this.digitalRead.args[0][1],
      spy = this.sandbox.spy();

    test.expect(1);
    this.sensor.on("data", spy);
    data(1);
    this.clock.tick(25);
    test.ok(spy.calledOnce);
    test.done();
  },

  change: function(test) {
    var callback = this.digitalRead.args[0][1],
      spy = this.sandbox.spy();

    test.expect(2);
    this.sensor.on("change", spy);
    callback(1);
    this.clock.tick(25);
    callback(0);
    this.clock.tick(25);

    test.equal(spy.getCall(0).args[0], 1);
    test.equal(spy.getCall(1).args[0], 0);
    test.done();
  },

  scale: function(test) {
    var callback = this.digitalRead.args[0][1];

    test.expect(2);

    // Scale the expected 0-1 to a value between 50-100 (~75)
    this.sensor.scale(50, 100);

    this.sensor.once("change", function() {
      test.equal(this.value, 100);
    });
    callback(1);
    this.clock.tick(25);

    this.sensor.once("change", function() {
      test.equal(this.value, 50);
    });
    callback(0);
    this.clock.tick(25);

    test.done();
  },

  booleanAt: function(test) {
    var callback = this.digitalRead.args[0][1],
      expected = false;
    test.expect(2);

    this.sensor.booleanAt(0);

    this.sensor.on("data", function() {
      test.equals(this.boolean, expected);
    });

    callback(0);
    this.clock.tick(25);
    expected = true;
    callback(1);
    this.clock.tick(25);

    test.done();
  },

  constrained: function(test) {
    var callback = this.digitalRead.args[0][1];
    test.expect(1);

    this.sensor.on("data", function() {
      test.equals(this.constrained, 1);
    });

    callback(1);
    this.clock.tick(25);
    test.done();
  },

  analog: function(test) {
    var callback = this.digitalRead.args[0][1];

    test.expect(3);

    callback(1);
    test.equals(this.sensor.analog, 1);

    callback(0);
    test.equals(this.sensor.analog, 0);

    callback(0);
    test.equals(this.sensor.analog, 0);

    test.done();
  }
};


exports["Sensor.Collection"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.clock = this.sandbox.useFakeTimers();
    this.board = newBoard();
    this.analogRead = this.sandbox.spy(MockFirmata.prototype, "analogRead");

    done();
  },

  tearDown: function(done) {
    Sensor.purge();
    Board.purge();
    this.sandbox.restore();
    done();
  },

  instanceof: function(test) {
    test.expect(1);
    test.equal(Sensor.Collection({}) instanceof Sensor.Collection, true);
    test.done();
  },

  data: function(test) {
    test.expect(4);

    this.sensors = new Sensor.Collection(["A0", "A1", "A2"]);

    this.callbacks = [
      this.analogRead.getCall(0).args[1],
      this.analogRead.getCall(1).args[1],
      this.analogRead.getCall(2).args[1],
    ];

    var spy = this.sandbox.spy();

    this.sensors.on("data", spy);

    this.callbacks[0](0);
    this.callbacks[1](0);
    this.callbacks[2](0);

    this.clock.tick(25);
    this.callbacks[0](1023);
    this.callbacks[1](1023);
    this.callbacks[2](1023);
    this.clock.tick(25);
    this.callbacks[0](1);
    this.callbacks[1](1);
    this.callbacks[2](1);
    this.clock.tick(25);
    this.callbacks[0](2);

    test.equal(this.sensors.length, 3);
    test.equal(this.sensors[0].value, 2);
    test.equal(this.sensors[1].value, 1);
    test.equal(this.sensors[2].value, 1);
    test.done();

  },

  change: function(test) {
    test.expect(4);

    this.sensors = new Sensor.Collection({
      pins: ["A0", "A1", "A2"],
      board: this.board,
    });

    this.callbacks = [
      this.analogRead.getCall(0).args[1],
      this.analogRead.getCall(1).args[1],
      this.analogRead.getCall(2).args[1],
    ];

    var spy = this.sandbox.spy();

    this.sensors.on("change", spy);

    this.callbacks[0](0);
    this.callbacks[1](0);
    this.callbacks[2](0);
    this.callbacks[0](1023);
    this.callbacks[1](1023);
    this.callbacks[2](1023);
    this.callbacks[0](1);
    this.callbacks[1](1);
    this.callbacks[2](1);
    this.callbacks[0](2);

    test.equal(this.sensors.length, 3);
    test.equal(this.sensors[0].value, 2);
    test.equal(this.sensors[1].value, 1);
    test.equal(this.sensors[2].value, 1);
    test.done();

  },

  dataFromLateAddition: function(test) {
    test.expect(5);

    this.sensors = new Sensor.Collection({
      pins: ["A0", "A1", "A2"],
      board: this.board,
    });

    this.callbacks = [
      this.analogRead.getCall(0).args[1],
      this.analogRead.getCall(1).args[1],
      this.analogRead.getCall(2).args[1],
    ];

    var spy = this.sandbox.spy();

    this.sensors.on("change", spy);

    this.clock.tick(1);

    this.callbacks[0](1023);
    this.callbacks[1](1023);
    this.callbacks[2](1023);
    this.clock.tick(1);

    this.sensors.add(new Sensor("A3"));

    this.callbacks.push(this.analogRead.lastCall.args[1]);

    this.clock.tick(2);

    this.callbacks[3](1);
    this.callbacks[0](1);
    this.callbacks[1](1);
    this.callbacks[2](1);
    this.clock.tick(3);
    this.callbacks[3](2);

    test.equal(this.sensors.length, 4);
    test.equal(this.sensors[0].value, 1);
    test.equal(this.sensors[1].value, 1);
    test.equal(this.sensors[2].value, 1);
    test.equal(this.sensors[3].value, 2);
    test.done();

  },
};
