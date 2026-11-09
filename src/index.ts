import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { WindowShort, WINDOW_FRAMES } from "./videos/window/Window";
import { PlanShort, PlanProps, planFrames } from "./lib/PlanShort";
const C = (id: string, component: React.FC, d: number) => React.createElement(Composition, { id, component, durationInFrames: d, fps: 30, width: 1080, height: 1920, key: id });
const placeholder: PlanProps = { plan: { id: "empty", cast: {}, lines: [{ text: "hi", set: "bedroom" }] }, words: [{ w: "hi", s: 0, e: 1, line: 1 }] };
const Root: React.FC = () => React.createElement(React.Fragment, null,
  C("BridgeShort", BridgeShort, BRIDGE_FRAMES), C("WindowShort", WindowShort, WINDOW_FRAMES),
  React.createElement(Composition, { id: "PlanShort", key: "PlanShort", component: PlanShort as unknown as React.FC<Record<string, unknown>>, durationInFrames: 60, fps: 30, width: 1080, height: 1920,
    defaultProps: placeholder as unknown as Record<string, unknown>,
    calculateMetadata: ({ props }: { props: Record<string, unknown> }) => ({ durationInFrames: planFrames((props as unknown as PlanProps).words) }) }));
registerRoot(Root);
