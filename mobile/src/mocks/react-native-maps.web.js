/**
 * Web stub for react-native-maps.
 * react-native-maps uses native-only internals that do not work on web.
 * This shim returns no-op React components so the bundler does not crash.
 */
import React from "react";
import { View, Text } from "react-native";

const UnsupportedMap = () =>
  React.createElement(
    View,
    { style: { flex: 1, alignItems: "center", justifyContent: "center" } },
    React.createElement(Text, null, "Map not available on web")
  );

export default UnsupportedMap;
export const Marker = () => null;
export const Circle = () => null;
export const Polyline = () => null;
export const Polygon = () => null;
export const Callout = () => null;
export const MapCallout = () => null;
export const Overlay = () => null;
export const Heatmap = () => null;
export const PROVIDER_GOOGLE = "google";
export const PROVIDER_DEFAULT = null;
