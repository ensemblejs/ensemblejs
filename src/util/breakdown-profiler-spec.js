import requireInject from 'require-inject';
import sinon from 'sinon';
import expect from 'expect';

const valueOf = sinon.stub().returns(0);
const { start, stop, reset, results, breakdown, wrap, tabular, configure } = requireInject('./breakdown-profiler', {
  moment: () => ({
   valueOf
  })
});

describe('the breakdown profiler', () => {
  beforeEach(() => {
    reset();
    valueOf.returns(0);

    configure({
      profile: true,
      hz: 1
    })
  });

  it('should record the elapsed time since the start', () => {
    start('key');
    valueOf.returns(1000);
    stop('key');

    expect(results().key.times).toEqual([1000]);
  });

  it('should record different keys as different times', () => {
    start('key1');
    valueOf.returns(1000);
    stop('key1');
    start('key2');
    valueOf.returns(1500);
    stop('key2');

    expect(results().key1.times).toEqual([1000]);
    expect(results().key2.times).toEqual([500]);
  })

  it('should do this multiple times', () => {
    start('key3');
    valueOf.returns(1000);
    stop('key3');

    valueOf.returns(2000);

    start('key3');
    valueOf.returns(2500);
    stop('key3');

    expect(results().key3.times).toEqual([1000, 500]);
  });

  it('should track timing that is a subset of an already running timer', () => {
    start('outer');

    valueOf.returns(100);
    start('inner');
    valueOf.returns(400);
    stop('inner');

    valueOf.returns(500);
    start('inner');
    valueOf.returns(600);
    stop('inner');

    valueOf.returns(1000);
    stop('outer');

    expect(results().outer.times).toEqual([1000]);
    expect(results()['outer.inner'].times).toEqual([300, 100]);
  });

  it('should support wrapping functions', () => {
    const myFunction = (timeIn) => {
      valueOf.returns(timeIn + 1000);

      return 'woot';
    };

    const wrapped = wrap(myFunction);

    valueOf.returns(500);
    const ret = wrapped(500);

    expect(results().myFunction.times).toEqual([1000]);
    expect(ret).toEqual('woot');
  })

  it('can be reset', () => {
    start('key');
    valueOf.returns(1000);
    stop('key');

    reset()

    expect(results().key).toEqual(undefined);
  });

  it('should provide a breakdown of where time is spent', () => {
    start('outer');

    valueOf.returns(100);
    start('inner');

    valueOf.returns(200);
    start('inner-inner');

    valueOf.returns(250);
    stop('inner-inner');

    valueOf.returns(300);
    start('inner-inner');

    valueOf.returns(350);
    stop('inner-inner');

    valueOf.returns(400);
    stop('inner');

    valueOf.returns(500);
    start('other-inner');

    valueOf.returns(700);
    stop('other-inner');

    valueOf.returns(1000);
    stop('outer');

    expect(breakdown('outer')).toEqual({
      total: 1000,
      calls: 1,
      percent: 100.0,
      percentOfAll: 100.0,
      children: [
        {
          inner: {
            total: 300,
            calls: 1,
            percent: 30.0,
            percentOfAll: 30,
            children: [
              {
                'inner-inner': {
                  total: 100,
                  calls: 2,
                  percent: 33.33333333333333,
                  percentOfAll: 10
                }
              },
              {
                unknown: {
                  total: 200,
                  percent: 66.66666666666666,
                  percentOfAll: 20
                }
              }
            ]
          }
        },
        {
          'other-inner': {
            total: 200,
            calls: 1,
            percent: 20.0,
            percentOfAll: 20
          }
        },
        {
          unknown: {
            total: 500,
            percent: 50.0,
            percentOfAll: 50
          }
        }
      ]
    });
  })

  it('should provide a breakdown of where time is spent as tabular data', () => {
    start('outer');

    valueOf.returns(100);
    start('inner');

    valueOf.returns(200);
    start('inner-inner');

    valueOf.returns(275);
    stop('inner-inner');

    valueOf.returns(300);
    start('inner-inner');

    valueOf.returns(350);
    stop('inner-inner');

    valueOf.returns(400);
    stop('inner');

    valueOf.returns(500);
    start('other-inner');

    valueOf.returns(700);
    stop('other-inner');

    valueOf.returns(1000);
    stop('outer');

    expect(tabular('outer')).toEqual([
      ['Name', 'Total', 'Calls', 'Min', 'Avg', 'Max', 'Percent of Parent', 'Percent of All'],
      ['outer',                      1000,   1, 1000,   0, 1000, '100.00', '100.00'],
      ['outer.inner',                 300,   1,  300,   0,  300,  '30.00',  '30.00'],
      ['outer.inner.inner-inner',     125,   2,   50,   0,   75,  '41.67',  '12.50'],
      ['outer.inner.unknown',         175, '-',  '-', '-',  '-',  '58.33',  '17.50'],
      ['outer.other-inner',           200,   1,  200,   0,   200, '20.00',  '20.00'],
      ['outer.unknown',               500, '-',  '-', '-',  '-',  '50.00',  '50.00']
    ]);

    expect(tabular()).toEqual([
      ['Name', 'Total', 'Calls', 'Min', 'Avg', 'Max', 'Percent of Parent', 'Percent of All'],
      ['outer',                      1000,   1, 1000,   0, 1000, '100.00', '100.00'],
      ['outer.inner',                 300,   1,  300,   0,  300,  '30.00',  '30.00'],
      ['outer.inner.inner-inner',     125,   2,   50,   0,   75,  '41.67',  '12.50'],
      ['outer.inner.unknown',         175, '-',  '-', '-',  '-',  '58.33',  '17.50'],
      ['outer.other-inner',           200,   1,  200,   0,   200, '20.00',  '20.00'],
      ['outer.unknown',               500, '-',  '-', '-',  '-',  '50.00',  '50.00']
    ]);
  });

  it('should allow filtering to minimum percentage of all', () => {
    start('outer');

    valueOf.returns(100);
    start('inner');

    valueOf.returns(200);
    start('inner-inner');

    valueOf.returns(250);
    stop('inner-inner');

    valueOf.returns(300);
    start('inner-inner');

    valueOf.returns(350);
    stop('inner-inner');

    valueOf.returns(400);
    stop('inner');

    valueOf.returns(500);
    start('other-inner');

    valueOf.returns(700);
    stop('other-inner');

    valueOf.returns(1000);
    stop('outer');

    expect(breakdown('outer', { minimumPercentageOfAll: 30 })).toEqual({
      total: 1000,
      calls: 1,
      percent: 100.0,
      percentOfAll: 100.0,
      children: [
        {
          inner: {
            total: 300,
            calls: 1,
            percent: 30.0,
            percentOfAll: 30
          }
        },
        {
          unknown: {
            total: 500,
            percent: 50.0,
            percentOfAll: 50
          }
        }
      ]
    });
  })
});