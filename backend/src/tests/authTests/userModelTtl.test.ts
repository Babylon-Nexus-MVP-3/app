import { UserModel } from "../../models/userModel";

describe("UserModel TTL", () => {
  it("keeps deletedAt on a 30 day TTL instead of hard deleting immediately", () => {
    const indexes = UserModel.schema.indexes() as Array<
      [Record<string, number>, Record<string, number>]
    >;
    const deletedAtIndex = indexes.find(([fields]) => fields.deletedAt === 1)?.[1];

    expect(deletedAtIndex).toMatchObject({
      expireAfterSeconds: 30 * 24 * 60 * 60,
    });
  });
});
