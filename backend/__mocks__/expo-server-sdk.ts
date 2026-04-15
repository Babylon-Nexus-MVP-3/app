const mockSendPushNotificationsAsync = jest.fn().mockResolvedValue([]);

const ExpoMock = jest.fn().mockImplementation(() => ({
  sendPushNotificationsAsync: mockSendPushNotificationsAsync,
})) as jest.Mock & { isExpoPushToken: (token: string) => boolean };

ExpoMock.isExpoPushToken = (token: string) =>
  typeof token === "string" && token.startsWith("ExponentPushToken[");

export default ExpoMock;
