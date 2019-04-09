import { interpolate } from "@popmotion/popcorn"
import { Easing } from "@popmotion/easing"
import { CustomValueType } from "../types"

/**
 * @public
 */
export interface TransformOptions<T> {
    /**
     * Clamp values to within the given range. Defaults to `true`
     *
     * @public
     */
    clamp?: boolean

    /**
     * Easing functions to use on the interpolations between each value in the input and output ranges.
     *
     * If provided as an array, the array must be one item shorter than the input and output ranges, as the easings apply to the transition **between** each.
     *
     * @public
     */
    ease?: Easing | Easing[]

    /**
     * @internal
     */
    mixer?: (from: T, to: T) => (v: number) => any
}

const isCustomValueType = (v: any): v is CustomValueType => {
    return typeof v === "object" && v.mix
}

const getMixer = (v: any) => (isCustomValueType(v) ? v.mix : undefined)

/**
 * Transforms numbers into other values by mapping them from an input range to an output range.
 * Returns a number.
 *
 * @remarks
 *
 * Given an input range of `[0, 200]` and an output range of
 * `[0, 1]`, this function will return a value between `0` and `1`.
 * The input range must be a linear series of numbers. The output range
 * can be any supported value type, such as numbers, colors, shadows and more.
 * Every value in the output range must be of the same type and in the same format.
 *
 * ```jsx
 * import * as React from "react"
 * import { transform } from "framer"
 *
 * export function MyComponent() {
 *    const rangeA = [0, 200]
 *     const rangeB = [0, 1]
 *     const output = transform(100, rangeA, rangeB)
 *
 *     return { output }
 * }
 *
 * ```
 *
 * @param inputValue - A number to transform between the input and output ranges.
 * @param inputRange - A linear series of numbers (either all increasing or decreasing)
 * @param outputRange - A series of numbers, colors or strings. Must be the same length as `inputRange`.
 * @param options -
 *
 *  - clamp: boolean - Clamp values to within the given range. Defaults to `true`
 *
 * @public
 */
export function transform<T>(
    inputValue: number,
    inputRange: number[],
    outputRange: T[],
    options?: TransformOptions<T>
): T
/**
 * For improved performance, `transform` can pre-calculate the function that will transform a value between two ranges.
 *
 * ```jsx
 * const xRange = [-200, -100, 100, 200]
 * const opacityRange = [0, 1, 1, 0]
 * const transformXToOpacity = transform(xRange, opacityRange)
 *
 * transformXToOpacity(-150) // Returns 0.5
 * ```
 *
 * @param inputRange - A linear series of numbers (either all increasing or decreasing)
 * @param outputRange - A series of numbers, colors or strings. Must be the same length as `inputRange`.
 * @param options -
 *
 *  - clamp: boolean - Clamp values to within the given range. Defaults to `true`
 *
 * @public
 */
export function transform<T>(
    inputRange: number[],
    outputRange: T[],
    options?: TransformOptions<T>
): (input: number) => T
export function transform<T>(
    ...args:
        | [number, number[], T[], TransformOptions<T>?]
        | [number[], T[], TransformOptions<T>?]
) {
    const useImmediate = !Array.isArray(args[0])
    const argOffset = useImmediate ? 0 : -1
    const inputValue = args[0 + argOffset] as number
    const inputRange = args[1 + argOffset] as number[]
    const outputRange = args[2 + argOffset] as T[]
    const options = args[3 + argOffset] as TransformOptions<T>

    const interpolator = interpolate(inputRange, outputRange, {
        mixer: getMixer(outputRange[0]),
        ...options,
    })

    return useImmediate ? interpolator(inputValue) : interpolator
}
