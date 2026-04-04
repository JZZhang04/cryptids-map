import { ApolloClient, InMemoryCache } from "@apollo/client";
import { SchemaLink } from "@apollo/client/link/schema";
import { schema, rootValue } from "./schema";

export const client = new ApolloClient({
  link: new SchemaLink({ schema, rootValue }),
  cache: new InMemoryCache(),
});
