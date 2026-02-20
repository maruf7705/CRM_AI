import type { ChannelType } from "@prisma/client";
import { BadRequestError } from "../../../utils/errors";
import type { BaseProvider } from "./base.provider";
import { FacebookProvider } from "./facebook.provider";
import { InstagramProvider } from "./instagram.provider";
import { WhatsappProvider } from "./whatsapp.provider";

const providerRegistry: Partial<Record<ChannelType, BaseProvider>> = {
  FACEBOOK: new FacebookProvider(),
  INSTAGRAM: new InstagramProvider(),
  WHATSAPP: new WhatsappProvider(),
};

export const getProviderForChannelType = (channelType: ChannelType): BaseProvider => {
  const provider = providerRegistry[channelType];
  if (!provider) {
    throw new BadRequestError(`Channel type ${channelType} does not have an integration provider`);
  }

  return provider;
};

export const getProviderByConnectType = (connectType: "FACEBOOK" | "INSTAGRAM"): BaseProvider => {
  return getProviderForChannelType(connectType);
};
