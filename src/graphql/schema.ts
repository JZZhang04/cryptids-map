import { buildSchema } from "graphql";
import creaturesData from "../data/cryptids_data.json";

export const schema = buildSchema(`
  type Creature {
    name: String!
    location: String!
    coords: [Float!]!
    description: String!
    category: String!
  }

  type Query {
    creatures(category: String): [Creature!]!
    creature(name: String!): Creature
  }
`);

export const rootValue = {
  creatures: ({ category }: { category?: string }) => {
    if (!category || category === "All") return creaturesData;
    return creaturesData.filter((c) => c.category === category);
  },
  creature: ({ name }: { name: string }) =>
    creaturesData.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null,
};
