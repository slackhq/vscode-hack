/**
 * Types for hh_client responses
 */

type Version = {
  commit: string;
  commit_time: number;
  api_version: number;
};

type Position = {
  filename: string;
  line: number;
  char_start: number;
  char_end: number;
};

type Span = {
  filename: string;
  line_start: number;
  char_start: number;
  line_end: number;
  char_end: number;
};

type CheckResponse = {
  passed: boolean;
  errors: {
    message: {
      descr: string;
      path: string;
      line: number;
      start: number;
      end: number;
      code: number;
    }[];
  }[];
};

export type OutlineResponse = {
  name: string;
  kind: string;
  id: string;
  position: Position;
  span: Span;
  children: OutlineResponse[];
};

type SearchResponse = {
  name: string;
  filename: string;
  desc: string;
  line: number;
  char_start: number;
  char_end: number;
  scope: string;
}[];

type IdeFindRefsResponse = {
  name: string;
  filename: string;
  line: number;
  char_start: number;
  char_end: number;
}[];

type IdeHighlightRefsResponse = {
  line: number;
  char_start: number;
  char_end: number;
}[];

type IdeGetDefinitionResponse = {
  name: string;
  result_type: string;
  pos: Position;
  definition_pos: Position;
  definition_span: Span;
  definition_id: number;
}[];

type AutoCompleteResponse = {
  name: string;
  type: string;
  pos: Position;
  func_details: {
    min_arity: number;
    return_type: string;
    params: {
      name: string;
      type: string;
      variadic: boolean;
    }[];
  };
}[];

type FormatResponse = {
  result: string;
  error_message: string;
  internal_error: boolean;
};

type TypeAtPosResponse = {
  type: string;
};
