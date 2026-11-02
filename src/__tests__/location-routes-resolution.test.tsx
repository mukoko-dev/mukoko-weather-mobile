/**
 * Expo Router's own route matching, for the file layout this slice adds: the
 * place's page at `location/[slug].tsx` and its two detail pages at
 * `location/[slug]/forecast.tsx` and `location/[slug]/atmosphere.tsx`, side by
 * side with no layout in the slug folder. The route files are stood in by
 * small components with the same names, so this checks the router's matching
 * and params, not the screens.
 */

import { act } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { renderRouter, screen, testRouter } from "expo-router/testing-library";
import { Text } from "react-native";

import { locationSubHref } from "@/components/weather/location-routes";

function Page({ name }: { name: string }) {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <Text testID="screen">{`${name}:${slug}`}</Text>;
}

const routes = {
  "location/[slug]": () => <Page name="place" />,
  "location/[slug]/forecast": () => <Page name="forecast" />,
  "location/[slug]/atmosphere": () => <Page name="atmosphere" />,
};

describe("the route tree under a place", () => {
  it("matches the place's page and each detail page, with the slug as a param", async () => {
    await renderRouter(routes, { initialUrl: "/location/harare" });
    expect(screen.getByTestId("screen").props.children).toBe("place:harare");

    await testRouter.push("/location/harare/forecast");
    expect(screen.getByTestId("screen").props.children).toBe("forecast:harare");

    await testRouter.push("/location/harare/atmosphere");
    expect(screen.getByTestId("screen").props.children).toBe(
      "atmosphere:harare",
    );
  });

  it("takes a spot slug with the -- delimiter on a detail page", async () => {
    await renderRouter(routes, {
      initialUrl: "/location/milton-park--kv0xq9z/forecast",
    });
    expect(screen.getByTestId("screen").props.children).toBe(
      "forecast:milton-park--kv0xq9z",
    );
  });

  it("opens a detail page from the typed href the links use, and goes back", async () => {
    await renderRouter(routes, { initialUrl: "/location/harare" });
    await act(async () => {
      router.push(locationSubHref("harare", "forecast"));
    });
    expect(screen.getByTestId("screen").props.children).toBe("forecast:harare");
    await act(async () => {
      router.back();
    });
    expect(screen.getByTestId("screen").props.children).toBe("place:harare");
  });
});
