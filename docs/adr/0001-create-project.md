# 1. create project

Date: 2022-06-29

## Status

2022-06-29 accepted

## Context

According to ["Elastic Provider Events"](https://hackmd.io/7FHjMKZ2TgGycAvapvBqqw):
> We need visibility into the progress/status of items as they are ingested into EP and provided to the indexer nodes.

Events can be emitted from elastic ipfs in those code repositories.

No codebase yet exists for a system that receives events from elastic ipfs.

## Decision

We will create this metrics-collector repository to house code related to receiving Elastic IPFS Events and aggregating them into useful metrics about the behavior of an elastic ipfs installation.

## Consequences

There is a place to collaborate on the Elastic Provider Events metrics-collector
