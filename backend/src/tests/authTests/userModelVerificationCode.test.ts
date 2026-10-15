import { UserModel } from "../../models/userModel";

describe("UserModel verificationCode", () => {
  it("is not uniquely indexed, so two pending users can share a code", () => {
    const indexes = UserModel.schema.indexes() as Array<
      [Record<string, number>, Record<string, unknown>]
    >;
    const codeIndex = indexes.find(([fields]) => fields.verificationCode !== undefined);

    expect(codeIndex?.[1]?.unique).not.toBe(true);
  });
});
