/**
 * `@ui-lib/react` — React bindings for UI-Lib.
 *
 * Two pieces:
 * - {@link GlassStage} boots the shared GPU layer for a subtree.
 * - {@link GlassPanel} attaches real refraction to a normal DOM element.
 *
 * Everything degrades: without a stage, on unsupported devices, or when the
 * user prefers reduced motion, panels render a CSS `backdrop-filter` fallback.
 */

export type { ScrollState, TrackKey } from "@ui-lib/motion";
export {
	beatLocal,
	beatWeight,
	revealWeight,
	SCROLL_CINEMA_BEATS,
	SCROLL_CINEMA_FADE,
	sampleTrack,
	scrollProgress,
} from "@ui-lib/motion";
export type { GlassPanelHandle, GlassPanelOptions } from "@ui-lib/renderer";
export { LOOKS, type LookName, resolveLook } from "@ui-lib/renderer";
export type { DomAnchor } from "./anchor.js";
export type { BlingProps } from "./Bling.js";
export { Bling } from "./Bling.js";
export type { BubbleBadgeProps } from "./BubbleBadge.js";
export { BubbleBadge } from "./BubbleBadge.js";
export type { CrystalTextProps } from "./CrystalText.js";
export { CrystalText } from "./CrystalText.js";
export type { GlassStageStatus, GlassStageValue } from "./context.js";
export { GlassStageContext, useGlassStage } from "./context.js";
export type { GlassPanelProps } from "./GlassPanel.js";
export { GlassPanel } from "./GlassPanel.js";
export type { GlassStageProps } from "./GlassStage.js";
export { GlassStage } from "./GlassStage.js";
export { ensureStyles } from "./injectStyles.js";
export type { IrisPanelProps } from "./irisTypes.js";
export type { LensProps } from "./Lens.js";
export { Lens } from "./Lens.js";
export type { LiquidGlassProps, LiquidTint } from "./LiquidGlass.js";
export { LiquidGlass } from "./LiquidGlass.js";
export type {
	FieldLookName,
	GlassLookName,
	LensLookName,
	LensOptical,
} from "./looks.js";
export {
	CINEMA_LENS_ENVIRONMENT,
	FIELD_LOOKS,
	fieldOptions,
	GLASS_LOOKS,
	LENS_LOOKS,
	resolveLensLook,
} from "./looks.js";
export type { MagneticProps } from "./Magnetic.js";
export { Magnetic } from "./Magnetic.js";
export type { OpticsProps } from "./Optics.js";
export { Optics } from "./Optics.js";
export { anchorNameFrom, usePopover } from "./overlay.js";
export type { ParticleFieldProps } from "./ParticleField.js";
export { ParticleField } from "./ParticleField.js";
export type { PinkPaperButtonProps } from "./PinkPaperButton.js";
export { PinkPaperButton } from "./PinkPaperButton.js";
export type { PointerTrailProps } from "./PointerTrail.js";
export { PointerTrail } from "./PointerTrail.js";
export type { RevealProps } from "./Reveal.js";
export { Reveal } from "./Reveal.js";
export { useReducedMotion } from "./reducedMotion.js";
export type { ScrollPinProps, ScrollTrackProps } from "./ScrollTrack.js";
export { ScrollPin, ScrollTrack, useScrollTrack, useScrollTrackHandle } from "./ScrollTrack.js";
export type { SoftAccordionItem, SoftAccordionProps } from "./SoftAccordion.js";
export { SoftAccordion } from "./SoftAccordion.js";
export type { SoftCardProps } from "./SoftCard.js";
export { SoftCard } from "./SoftCard.js";
export type { SoftCheckboxProps, SoftRadioProps } from "./SoftChoice.js";
export { SoftCheckbox, SoftRadio, SoftRadioGroup } from "./SoftChoice.js";
export type { SoftDividerProps, SoftDrawerProps } from "./SoftDrawer.js";
export { SoftDivider, SoftDrawer } from "./SoftDrawer.js";
export type { SoftAvatarProps, SoftTagProps } from "./SoftIdentity.js";
export { SoftAvatar, SoftTag } from "./SoftIdentity.js";
export type { SoftInputProps } from "./SoftInput.js";
export { SoftInput } from "./SoftInput.js";
export type { SoftLightPanelProps } from "./SoftLightPanel.js";
export { SoftLightPanel } from "./SoftLightPanel.js";
export type { SoftProgressProps, SoftSkeletonProps, SoftSpinnerProps } from "./SoftLoading.js";
export { SoftProgress, SoftSkeleton, SoftSpinner } from "./SoftLoading.js";
export type { SoftModalProps } from "./SoftModal.js";
export { SoftModal } from "./SoftModal.js";
export type { SoftToastData, SoftToastProps, SoftTooltipProps } from "./SoftOverlay.js";
export { SoftToast, SoftTooltip } from "./SoftOverlay.js";
export type { SoftSelectOption, SoftSelectProps } from "./SoftSelect.js";
export { SoftSelect } from "./SoftSelect.js";
export type { SoftSliderProps } from "./SoftSlider.js";
export { SoftSlider } from "./SoftSlider.js";
export type { SoftSwitchProps } from "./SoftSwitch.js";
export { SoftSwitch } from "./SoftSwitch.js";
export type { SoftTableColumn, SoftTableProps } from "./SoftTable.js";
export { SoftTable } from "./SoftTable.js";
export type { SoftTabsProps } from "./SoftTabs.js";
export { SoftTabs } from "./SoftTabs.js";
export { useFrame } from "./useFrame.js";
export type { WatercolorCardProps } from "./WatercolorCard.js";
export { WatercolorCard } from "./WatercolorCard.js";
