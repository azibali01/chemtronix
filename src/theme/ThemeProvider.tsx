import { MantineProvider, type MantineThemeOverride } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { Notifications } from "@mantine/notifications";
import type { PropsWithChildren } from "react";

const theme: MantineThemeOverride = {};

type Props = PropsWithChildren;

const ThemeProvider = (props: Props) => {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" zIndex={9999} />
      {props.children}
    </MantineProvider>
  );
};

export default ThemeProvider;
