import { ResolvedValueTarget, Transition } from "../types"
import { secondsToMilliseconds } from "../utils/time-conversion"
import { instantAnimationState } from "../utils/use-instant-transition-state"
import type { MotionValue, StartAnimation } from "../value"
import { createAcceleratedAnimation } from "./create-accelerated-animation"
import { createInstantAnimation } from "./create-instant-animation"
import { animate } from "./legacy-popmotion"
import { inertia } from "./legacy-popmotion/inertia"
import { AnimationOptions } from "./types"
import { getDefaultTransition } from "./utils/default-transitions"
import { getKeyframes } from "./utils/keyframes"
import { getValueTransition, isTransitionDefined } from "./utils/transitions"
import { supports } from "./waapi/supports"

/**
 * A list of values that can be hardware-accelerated.
 */
const acceleratedValues = new Set<string>([])

export const createMotionValueAnimation = (
    valueName: string,
    value: MotionValue,
    target: ResolvedValueTarget,
    transition: Transition & { elapsed?: number } = {}
): StartAnimation => {
    return (onComplete: VoidFunction) => {
        const valueTransition = getValueTransition(transition, valueName) || {}

        /**
         * Most transition values are currently completely overwritten by value-specific
         * transitions. In the future it'd be nicer to blend these transitions. But for now
         * delay actually does inherit from the root transition if not value-specific.
         */
        const delay = valueTransition.delay || transition.delay || 0

        /**
         * Elapsed isn't a public transition option but can be passed through from
         * optimized appear effects in milliseconds.
         */
        let { elapsed = 0 } = transition
        elapsed = elapsed - secondsToMilliseconds(delay)

        const canAnimate = true

        const keyframes = getKeyframes(
            value,
            valueName,
            target,
            valueTransition
        )

        let options: AnimationOptions = {
            keyframes,
            velocity: value.getVelocity(),
            elapsed,
            onUpdate: (v) => {
                value.set(v)
                valueTransition.onUpdate && valueTransition.onUpdate(v)
            },
            onComplete: () => {
                onComplete()
                valueTransition.onComplete && valueTransition.onComplete()
            },
            ...valueTransition,
        }

        if (
            !canAnimate ||
            instantAnimationState.current ||
            valueTransition.type === false
        ) {
            /**
             * If we can't animate this value, or the global instant animation flag is set,
             * or this is simply defined as an instant transition, return an instant transition.
             */
            return createInstantAnimation(options)
        } else if (valueTransition.type === "inertia") {
            /**
             * If this is an inertia animation, we currently don't support pre-generating
             * keyframes for this as such it must always run on the main thread.
             */
            const animation = inertia(options)

            return () => animation.stop()
        }

        /**
         * If there's no transition defined for this value, we can generate
         * unqiue transition settings for this value.
         */
        if (!isTransitionDefined(valueTransition)) {
            options = {
                ...options,
                ...getDefaultTransition(valueName, options),
            }
        }

        /**
         * Both WAAPI and our internal animation functions use durations
         * as defined by milliseconds, while our external API defines them
         * as seconds.
         */
        if (options.duration) {
            options.duration = secondsToMilliseconds(options.duration)
        }

        if (options.repeatDelay) {
            options.repeatDelay = secondsToMilliseconds(options.repeatDelay)
        }

        const canAccelerateAnimation =
            acceleratedValues.has(valueName) &&
            supports.waapi() &&
            value.owner &&
            !value.owner.getProps().onUpdate &&
            !options.repeat

        if (canAccelerateAnimation) {
            /**
             * If this animation is capable of being run via WAAPI, then do so.
             *
             * TODO: Currently no values are hardware accelerated so this clause
             * will never trigger. Animation to be added in subsequent PR.
             */
            return createAcceleratedAnimation()
        } else {
            /**
             * Otherwise, fall back to the main thread.
             */
            const animation = animate(options)

            return () => animation.stop()
        }
    }
}
