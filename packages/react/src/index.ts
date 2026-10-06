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
export type { GlassStageStatus, GlassStageValue } from "./context.js";
export { GlassStageContext, useGlassStage } from "./context.js";
export type { FrostedGroundProps } from "./FrostedGround.js";
export { FrostedGround } from "./FrostedGround.js";
export type { FieldWiring } from "./field.js";
export { useField } from "./field.js";
export type {
	FloatingAlign,
	FloatingOptions,
	FloatingPlacement,
	FloatingRect,
	FloatingResult,
	FloatingSide,
	UseFloatingProps,
} from "./floating.js";
export {
	computeFloatingPosition,
	getOppositeSide,
	parsePlacement,
	useFloatingPosition,
} from "./floating.js";
export type { GlassPanelProps } from "./GlassPanel.js";
export { GlassPanel } from "./GlassPanel.js";
export type { GlassStageProps } from "./GlassStage.js";
export { GlassStage } from "./GlassStage.js";
export { ensureStyles } from "./injectStyles.js";
export type { IrisPanelProps, PanelProps } from "./irisTypes.js";
export type { LiquidGlassProps, LiquidTint } from "./LiquidGlass.js";
export { LiquidGlass } from "./LiquidGlass.js";
export type {
	FieldLookName,
	GlassLookName,
	GlassPresetName,
	LensLookName,
	LensOptical,
	ResolveGlassOptions,
} from "./looks.js";
export {
	CINEMA_LENS_ENVIRONMENT,
	FIELD_LOOKS,
	fieldOptions,
	GLASS_LOOKS,
	LENS_LOOKS,
	resolveGlassPreset,
	resolveLensLook,
} from "./looks.js";
export type { MagneticProps } from "./Magnetic.js";
export { Magnetic } from "./Magnetic.js";
export type {
	GroundContrast,
	MaterialOptions,
	MaterialResult,
	SoftMaterial,
} from "./material.js";
export {
	computeEffectiveGroundLuminance,
	MATERIAL_GROUND_CLASS,
	srgbLuminance,
	useMaterial,
} from "./material.js";
export type { SpringInteractionOptions, SpringInteractionResult } from "./motion.js";
export {
	FOCUS_HALO,
	PRESS_DAMPING,
	PRESS_EASING,
	useSpringInteraction,
} from "./motion.js";
export { anchorNameFrom, usePopover } from "./overlay.js";
export type { ParticleFieldProps } from "./ParticleField.js";
export { ParticleField } from "./ParticleField.js";
export type { PinkPaperButtonProps, SoftButtonProps } from "./PinkPaperButton.js";
export { PinkPaperButton, SoftButton } from "./PinkPaperButton.js";
export type { RevealProps } from "./Reveal.js";
export { Reveal } from "./Reveal.js";
export { useReducedMotion } from "./reducedMotion.js";
export type { ScrollPinProps, ScrollTrackProps } from "./ScrollTrack.js";
export { ScrollPin, ScrollTrack, useScrollTrack, useScrollTrackHandle } from "./ScrollTrack.js";
export type { SoftAccordionItem, SoftAccordionProps } from "./SoftAccordion.js";
export { SoftAccordion } from "./SoftAccordion.js";
export type { SoftBadgeProps } from "./SoftBadge.js";
export { SoftBadge } from "./SoftBadge.js";
export type { SoftCardProps } from "./SoftCard.js";
export { SoftCard } from "./SoftCard.js";
export type { SoftChipProps, SoftStep, SoftStepperProps } from "./SoftChipStepper.js";
export { SoftChip, SoftStepper } from "./SoftChipStepper.js";
export type { SoftCheckboxProps, SoftRadioGroupProps, SoftRadioProps } from "./SoftChoice.js";
export { SoftCheckbox, SoftRadio, SoftRadioGroup } from "./SoftChoice.js";
export type { SoftComboboxOption, SoftComboboxProps } from "./SoftCombobox.js";
export { SoftCombobox } from "./SoftCombobox.js";
export type { SoftCommandItem, SoftCommandPaletteProps } from "./SoftCommandPalette.js";
export { matchCommand, SoftCommandPalette } from "./SoftCommandPalette.js";
export type {
	SoftDataTableColumn,
	SoftDataTableProps,
	SoftDataTableSort,
} from "./SoftDataTable.js";
export { SoftDataTable } from "./SoftDataTable.js";
export type { SoftDividerProps, SoftDrawerProps } from "./SoftDrawer.js";
export { SoftDivider, SoftDrawer } from "./SoftDrawer.js";
export type { SoftAvatarProps, SoftTagProps } from "./SoftIdentity.js";
export { SoftAvatar, SoftTag } from "./SoftIdentity.js";
export type { SoftInputProps } from "./SoftInput.js";
export { SoftInput } from "./SoftInput.js";
export type { SoftLightPanelProps } from "./SoftLightPanel.js";
export { SoftLightPanel } from "./SoftLightPanel.js";
export type { SoftListItem, SoftListProps } from "./SoftList.js";
export { SoftList } from "./SoftList.js";
export type { SoftProgressProps, SoftSkeletonProps, SoftSpinnerProps } from "./SoftLoading.js";
export { SoftProgress, SoftSkeleton, SoftSpinner } from "./SoftLoading.js";
export type { SoftMenuItem, SoftMenuProps } from "./SoftMenu.js";
export { SoftMenu } from "./SoftMenu.js";
export type { SoftModalProps } from "./SoftModal.js";
export { SoftModal } from "./SoftModal.js";
export type {
	SoftBreadcrumbItem,
	SoftBreadcrumbProps,
	SoftPaginationProps,
} from "./SoftNavigation.js";
export { SoftBreadcrumb, SoftPagination } from "./SoftNavigation.js";
export type { SoftToastData } from "./SoftOverlay.js";
export type { SoftPopoverProps } from "./SoftPopover.js";
export { SoftPopover } from "./SoftPopover.js";
export type { SoftSegmentedControlProps, SoftSegmentOption } from "./SoftSegmentedControl.js";
export { SoftSegmentedControl } from "./SoftSegmentedControl.js";
export type { SoftSelectOption, SoftSelectProps } from "./SoftSelect.js";
export { SoftSelect } from "./SoftSelect.js";
export type { SoftSliderProps } from "./SoftSlider.js";
export { SoftSlider } from "./SoftSlider.js";
export type { SoftAlertProps, SoftEmptyStateProps } from "./SoftStatus.js";
export { SoftAlert, SoftEmptyState } from "./SoftStatus.js";
export type { SoftSwitchProps } from "./SoftSwitch.js";
export { SoftSwitch } from "./SoftSwitch.js";
export type { SoftTableColumn, SoftTableProps } from "./SoftTable.js";
export { SoftTable } from "./SoftTable.js";
export type { SoftTabsProps } from "./SoftTabs.js";
export { SoftTabs } from "./SoftTabs.js";
export type { SoftTextareaProps } from "./SoftTextarea.js";
export { SoftTextarea } from "./SoftTextarea.js";
export type {
	SoftToasterProps,
	SoftToastProps,
	SoftToastProviderProps,
} from "./SoftToast.js";
export {
	SoftToast,
	SoftToaster,
	SoftToastProvider,
} from "./SoftToast.js";
export type { SoftToolbarItem, SoftToolbarProps } from "./SoftToolbar.js";
export { SoftToolbar } from "./SoftToolbar.js";
export type { SoftTooltipProps } from "./SoftTooltip.js";
export { SoftTooltip } from "./SoftTooltip.js";
export type { SoftTreeNode, SoftTreeProps } from "./SoftTree.js";
export { SoftTree } from "./SoftTree.js";
export { pageRange } from "./softNavigationRange.js";
export type {
	ToastContextValue,
	ToastData,
	ToastOptions,
	ToastPosition,
	ToastVariant,
} from "./toast.js";
export { ToastContext, toast, useToast } from "./toast.js";
export { useFrame } from "./useFrame.js";
export type { WatercolorBoardProps } from "./WatercolorBoard.js";
export { WatercolorBoard } from "./WatercolorBoard.js";
export type { WatercolorCardProps } from "./WatercolorCard.js";
export { WatercolorCard } from "./WatercolorCard.js";
