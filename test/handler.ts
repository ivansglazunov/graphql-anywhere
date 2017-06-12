import { assert } from 'chai';

import graphql from '../src';
import gql from 'graphql-tag';

import { cloneElement, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('result handler', () => {
  it('can deal with promises', () => {
    const resolver = (name, root) => {
      return new Promise((resolve) => {
        Promise.resolve(root).then((resolvedRoot) => {
          setTimeout(() => {
            if (name === 'a') {
              resolve([{ b: 'c', d: 'e' }]);
            } else if (name === 'b') {
              resolve(root[name] + 'x');
            }
          }, 10);
        });
      });
    };

    function resultHandler(result, execute) {
      return new Promise((resolve) => {
        Promise.resolve(result).then((resolvedResult) => {
          resolve(execute(resolvedResult));
        });
      });
    }

    function promiseForObject(object, root): Promise<{[key: string]: any}> {
      const keys = Object.keys(object);
      const valuesAndPromises = keys.map(name => {
        return object[name].then((values) => Array.isArray(values) ? Promise.all(values) : values);
      });
      return Promise.all(valuesAndPromises).then(
        (values) => values.reduce((resolvedObject, value, i) => {
          resolvedObject[keys[i]] = value;
          return resolvedObject;
        }, Object.create(null)),
      );
    }

    const query = gql`
      {
        a {
          b
        }
      }
    `;

    const result = graphql(
      resolver,
      query,
      '',
      null,
      null,
      {
        resultHandler: resultHandler,
        resultMapper: promiseForObject,
      },
    );

    return result.then((value) => {
      assert.deepEqual(value, {
        a: [{
          b: 'cx',
        }],
      });
    });
  });
});
