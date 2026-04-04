import { gql } from "@apollo/client";

export const GET_CREATURES = gql`
  query GetCreatures($category: String) {
    creatures(category: $category) {
      name
      location
      coords
      description
      category
    }
  }
`;
