// Global Ant Design theme: red / white / gray palette.
// Keep these values in sync with the CSS variables in index.css.
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
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      headerBg: palette.white,
      bodyBg: palette.grayBg,
      siderBg: palette.charcoal,
      lightSiderBg: palette.white,
      triggerBg: palette.grayDark,
    },
    Menu: {
      itemSelectedBg: palette.redLight,
      itemSelectedColor: palette.red,
      itemHoverBg: palette.grayBg,
      itemBorderRadius: 8,
      darkItemBg: palette.charcoal,
      darkSubMenuItemBg: '#2b2b2b',
      darkItemSelectedBg: palette.red,
      darkItemHoverBg: '#333333',
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

export default theme;
