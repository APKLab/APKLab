// This file is necessary because webpack will fail to load the `any-observable`
// package (which is a transitive dependency of `apk-mitm`) otherwise. This file
// replaces that module and hard-codes the `Observable` implementation from
// `rxjs` as the one that is used by packages which import `any-observable`.

// eslint-disable-next-line import/no-default-export
export { Observable as default } from "rxjs";
