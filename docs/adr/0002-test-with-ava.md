# 2. test with ava

Date: 2022-06-29

## Status

2022-06-29 accepted

## Context

metrics-collector will be more reliable if we test it.

There are lots of testing tools to use, e.g.
* [ava](https://www.npmjs.com/package/ava)
* [jest](https://www.npmjs.com/package/jest)
* [mocha](https://mochajs.org/)

The dev team building elastic ipfs has previously made a decision to use ava for testing in node.js.

## Decision

We will use [ava](https://www.npmjs.com/package/ava) for testing the javascript code in this repository.

## Consequences

It is clear how devs should run/write tests in this project.

Testing in this project is consistent with testing in other projects like:
* https://github.com/nftstorage/nft.storage/tree/main/packages/cron

Tests cannot be organized into groups like with mocha/jest (e.g. using 'describe' blocks). [evidence](https://knapsackpro.com/testing_frameworks/difference_between/ava/vs/jest)
