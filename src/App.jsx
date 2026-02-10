import { useEffect, useMemo } from "react";
import AppRoutes from "./routes";
import { useGame } from "./engine/gameContext/gameContext";
import themes from "./assets/gameContent/themes";

export default function App() {
  const { gameState } = useGame();
  const activeThemeId =
    gameState?.campaign?.active === true
      ? gameState.campaign.themeId
      : gameState?.betting?.active === true
        ? gameState.betting.themeId
        : gameState?.themeId ?? "cars";

  const activeFont = useMemo(() => {
    const theme = themes.find((t) => t.id === activeThemeId);
    return theme?.fontFamily ?? "Audiowide";
  }, [activeThemeId]);

  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    if (navigation?.type === "reload" && window.location.pathname !== "/") {
      window.location.replace("/");
    }
  }, []);

  useEffect(() => {
    const fallback =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    document.documentElement.style.setProperty(
      "--font-primary",
      `"${activeFont}", ${fallback}`
    );
    document.documentElement.style.setProperty(
      "--font-size-bump",
      activeFont === "Creepster" ? "4px" : "0px"
    );
  }, [activeFont]);

  useEffect(() => {
    const theme = themes.find((t) => t.id === activeThemeId);
    const colors = theme?.uiColors ?? {};
    const buttonColors = theme?.buttonColors ?? {};
    const defaults = {
      siteBackground: "#11161c",
      primaryBackground: "#1f2a36",
      secondaryBackground: "#344659",
      tertiaryBackground: "#e6eef7",
      textOnPrimaryBackground: "#f5f7fb",
      textOnSecondaryBackground: "#f5f7fb",
      textOnTertiaryBackground: "#141a20",
      primaryForeground: "#f5f7fb",
      secondaryForeground: "#f5f7fb",
      tertiaryForeground: "#141a20",
      darkText: "#141a20",
      lightText: "#f5f7fb",
      links: "#6ec2ff",
    };
    const buttonDefaults = {
      primary: defaults.primaryBackground,
      primaryText: defaults.textOnPrimaryBackground,
      secondary: defaults.secondaryBackground,
      secondaryText: defaults.textOnSecondaryBackground,
      tertiary: defaults.tertiaryBackground,
      tertiaryText: defaults.textOnTertiaryBackground,
    };

    const resolved = {
      siteBackground: colors.siteBackground ?? defaults.siteBackground,
      primaryBackground: colors.primaryBackground ?? defaults.primaryBackground,
      secondaryBackground: colors.secondaryBackground ?? defaults.secondaryBackground,
      tertiaryBackground: colors.tertiaryBackground ?? defaults.tertiaryBackground,
      textOnPrimaryBackground:
        colors.textOnPrimaryBackground ??
        colors.primaryForeground ??
        defaults.textOnPrimaryBackground,
      textOnSecondaryBackground:
        colors.textOnSecondaryBackground ??
        colors.secondaryForeground ??
        defaults.textOnSecondaryBackground,
      textOnTertiaryBackground:
        colors.textOnTertiaryBackground ??
        colors.tertiaryForeground ??
        colors.darkText ??
        defaults.textOnTertiaryBackground,
      primaryForeground:
        colors.primaryForeground ??
        colors.textOnPrimaryBackground ??
        defaults.primaryForeground,
      secondaryForeground:
        colors.secondaryForeground ??
        colors.textOnSecondaryBackground ??
        defaults.secondaryForeground,
      tertiaryForeground:
        colors.tertiaryForeground ??
        colors.textOnTertiaryBackground ??
        defaults.tertiaryForeground,
      darkText:
        colors.darkText ??
        colors.textOnTertiaryBackground ??
        defaults.darkText,
      lightText:
        colors.lightText ??
        colors.textOnSecondaryBackground ??
        defaults.lightText,
      links: colors.links ?? defaults.links,
    };

    const resolvedButtons = {
      primary: buttonColors.primary?.background ?? buttonDefaults.primary,
      "primary-text": buttonColors.primary?.text ?? buttonDefaults.primaryText,
      secondary: buttonColors.secondary?.background ?? buttonDefaults.secondary,
      "secondary-text": buttonColors.secondary?.text ?? buttonDefaults.secondaryText,
      tertiary: buttonColors.tertiary?.background ?? buttonDefaults.tertiary,
      "tertiary-text": buttonColors.tertiary?.text ?? buttonDefaults.tertiaryText,
    };

    Object.entries(resolved).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
    Object.entries(resolvedButtons).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--button-${key}`, value);
    });

    const trackImage = theme?.trackBackground ? `url("${theme.trackBackground}")` : "none";
    const overlayValue = typeof theme?.trackOverlay === "number" ? theme.trackOverlay : 0;
    const overlayAlpha = Math.min(Math.abs(overlayValue) / 10, 1);
    const overlayColor =
      overlayValue === 0
        ? "transparent"
        : overlayValue < 0
          ? `rgba(0, 0, 0, ${overlayAlpha})`
          : `rgba(255, 255, 255, ${overlayAlpha})`;

    document.documentElement.style.setProperty("--track-bg-image", trackImage);
    document.documentElement.style.setProperty("--track-bg-overlay", overlayColor);
  }, [activeThemeId]);

  return <AppRoutes />;
}
