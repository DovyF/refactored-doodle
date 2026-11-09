import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { PresidentShort, PRESIDENT_FRAMES } from "./videos/president/President";
import { WindowShort, WINDOW_FRAMES } from "./videos/window/Window";
const C = (id: string, component: React.FC, d: number) => React.createElement(Composition, { id, component, durationInFrames: d, fps: 30, width: 1080, height: 1920, key: id });
const Root: React.FC = () => React.createElement(React.Fragment, null, C("BridgeShort", BridgeShort, BRIDGE_FRAMES), C("PresidentShort", PresidentShort, PRESIDENT_FRAMES), C("WindowShort", WindowShort, WINDOW_FRAMES));
registerRoot(Root);
