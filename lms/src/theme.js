import { theme as antdTheme } from 'antd';

export const palette = {
  red: '#c62828',
  redDark: '#b71c1c',
  redLight: '#fdecea',
  redBorder: '#f5c2c0',
  charcoal: '#212121',
  grayDark: '#424242',
  gray: '#757575',
  grayBorder: '#e0e0e0',
  grayBg: '#f5f5f5',
  white: '#ffffff',
};

const theme = {
  token: {
    colorPrimary: palette.red,
    colorLink: palette.red,
    colorLinkHover: palette.redDark,
    colorInfo: palette.grayDark,
    colorError: '#d32f2f',
    colorBgLayout: palette.grayBg,
    colorBorder: '#d6d6d6',
    colorBorderSecondary: palette.grayBorder,
    colorText: palette.charcoal,
    colorTextSecondary: palette.gray,
    borderRadius: 10,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      headerBg: palette.white,
      bodyBg: palette.grayBg,
      siderBg: '#141414',
      lightSiderBg: palette.white,
      triggerBg: palette.grayDark,
    },
    Menu: {
      itemSelectedBg: palette.redLight,
      itemSelectedColor: palette.red,
      itemHoverBg: palette.grayBg,
      itemBorderRadius: 8,
      darkItemBg: 'transparent',
      darkSubMenuItemBg: '#2b2b2b',
      darkItemSelectedBg: palette.red,
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemColor: 'rgba(255,255,255,0.72)',
    },
    Card: {
      headerBg: palette.white,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: palette.grayDark,
      rowHoverBg: '#fff7f6',
    },
    Tabs: {
      inkBarColor: palette.red,
      itemSelectedColor: palette.red,
      itemHoverColor: palette.redDark,
    },
    Button: {
      primaryShadow: '0 2px 6px rgba(198, 40, 40, 0.25)',
    },
  },
};

export const darkTheme = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...theme.token,
    colorPrimary: '#e53935',
    colorLink: '#ff6b66',
    colorLinkHover: '#ff8a80',
    colorInfo: '#9e9e9e',
    colorError: '#ff5252',
    colorBgBase: '#0e0e0e',
    colorBgLayout: '#0b0b0b',
    colorBgContainer: '#161616',
    colorBgElevated: '#1d1d1d',
    colorBorder: '#333333',
    colorBorderSecondary: '#262626',
    colorText: '#ececec',
    colorTextSecondary: '#a3a3a3',
  },
  components: {
    ...theme.components,
    Layout: { ...theme.components.Layout, headerBg: '#121212', bodyBg: '#0b0b0b', lightSiderBg: '#121212' },
    Menu: { ...theme.components.Menu, itemSelectedBg: 'rgba(229, 57, 53, 0.16)', itemSelectedColor: '#ff6b66', itemHoverBg: '#1f1f1f' },
    Card: { headerBg: '#161616' },
    Table: { headerBg: '#1d1d1d', headerColor: '#cfcfcf', rowHoverBg: '#2a1313' },
    Tabs: { inkBarColor: '#e53935', itemSelectedColor: '#ff6b66', itemHoverColor: '#ff8a80' },
    Button: { primaryShadow: '0 2px 10px rgba(229, 57, 53, 0.35)' },
  },
};

export const getTheme = (mode) => (mode === 'dark' ? darkTheme : theme);

export default theme;
