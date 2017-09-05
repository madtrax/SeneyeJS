# SeneyeJS

Quick way to read data from a Seneye Montior over USB (Compatible with Arduino, MacOSX etc...)

## Example

```js
new Seneye().on('complete', handleData).read();
```

#### Example

```js
{ timestamp: 1504597825,
  bits: 
   { inWater: 1,
     slideNotFitted: 0,
     slideExpired: 1,
     stateT: 1,
     statePh: 0,
     stateNh: 0,
     error: 0,
     isKelvin: 0 },
  ph: 0,
  nh: 0,
  temp: 24.875,
  lux: 6,
  par: 0,
  pur: 0,
  kelvin: 0 }
```
