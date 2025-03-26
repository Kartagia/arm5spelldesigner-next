
import Home from "../src/app/page";
import { render, screen } from '@testing-library/react';

/**
 * Test testing, if home component is rendered.
 */
function testRenderedHomeComponent() {
    render(<Home />);
    expect(
        screen.getByText("Examples")
    ).toBeInTheDocument()
}

describe("Default home component", function () {
    it("Is base page rendered", testRenderedHomeComponent);
});