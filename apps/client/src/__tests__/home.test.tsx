import { render, screen } from "@testing-library/react-native";
import HomeScreen from "../app/index";

it("renders the scaffold screen with the Expo test preset", async () => {
  await render(<HomeScreen />);

  expect(screen.getByText("ClipScribe")).toBeOnTheScreen();
});
