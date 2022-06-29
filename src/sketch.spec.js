import test from "ava"
import { pipeline, take, collect } from "streaming-iterables"

test('createExampleIpfsEvents', async (t) => {
    const firstTen = await pipeline(
        createExampleIpfsEvents,
        take(10),
        collect
    )
    t.is(firstTen.length, 10)
})

function createExampleIpfsEvents() {
    return new Array(100).fill(0).map((e,i) => i)
}
