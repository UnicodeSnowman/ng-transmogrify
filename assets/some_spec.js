import { formatters } from "../../support/matchers";

describe("htInputFormatArea", () => {
  let formatter;
  let localizationContext;

  beforeEach(() => {
    jasmine.addMatchers(formatters);

    inject((htInputFormatArea, _Lookup_) => {
      formatter = htInputFormatArea;
      localizationContext = { area_unit_id: Lookup.AreaUnit.SM.id };
    });
  });

  describe("formatting", () => {
    it("formats a number", () => {
      expect(formatter).toFormat(1000, "1,000 m²", localizationContext);
    });
  });
});
