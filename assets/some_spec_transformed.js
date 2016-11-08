import LookupModule from "../app/common/lookup";
import htInputFormatAreaModule from "../app/common/ht_input_format_area";
import {formatters} from "../../support/matchers";

describe("htInputFormatArea", () => {
  let formatter;
  let localizationContext;

  beforeEach(() => {
    angular.mock.module(htInputFormatAreaModule, LookupModule);
    jasmine.addMatchers(formatters);

    inject((htInputFormatArea, _Lookup_) => {
      formatter = htInputFormatArea;

      localizationContext = {
        area_unit_id: Lookup.AreaUnit.SM.id
      };
    });
  });

  describe("formatting", () => {
    it("formats a number", () => {
      expect(formatter).toFormat(1000, "1,000 m²", localizationContext);
    });
  });
});
