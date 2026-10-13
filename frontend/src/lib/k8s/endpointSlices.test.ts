/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';
import App from '../../App';
import EndpointSlice from './endpointSlices';

// cyclic imports fix
// eslint-disable-next-line no-unused-vars
const _dont_delete_me = App;

describe('EndpointSlice class', () => {
  describe('getBaseObject', () => {
    it('returns an EndpointSlice with correct defaults', () => {
      const base = EndpointSlice.getBaseObject();
      expect(base.kind).toBe('EndpointSlice');
      expect(base.apiVersion).toBe('discovery.k8s.io/v1');
    });
  });

  describe('ports', () => {
    it('returns port numbers from spec', () => {
      const slice = new EndpointSlice({
        metadata: { name: 'test-slice', namespace: 'default' },
        ports: [
          { port: 80, protocol: 'TCP' },
          { port: 443, protocol: 'TCP' },
        ],
      } as any);

      expect(slice.ports).toEqual([80, 443]);
    });

    it('returns empty array when no ports defined', () => {
      const slice = new EndpointSlice({
        metadata: { name: 'test-slice', namespace: 'default' },
      } as any);

      expect(slice.ports).toEqual([]);
    });
  });

  describe('getOwnerServiceName', () => {
    it('returns service name from kubernetes.io/service-name label', () => {
      const slice = new EndpointSlice({
        metadata: {
          name: 'kubernetes',
          namespace: 'default',
          labels: {
            'kubernetes.io/service-name': 'kubernetes',
          },
        },
      } as any);

      expect(slice.getOwnerServiceName()).toBe('kubernetes');
    });

    it('falls back to ownerReferences when label is not present', () => {
      const slice = new EndpointSlice({
        metadata: {
          name: 'nginx-65mbh',
          namespace: 'default',
          ownerReferences: [
            {
              apiVersion: 'v1',
              kind: 'Service',
              name: 'nginx',
              uid: '12345',
            },
          ],
        },
      } as any);

      expect(slice.getOwnerServiceName()).toBe('nginx');
    });

    it('prefers kubernetes.io/service-name label over ownerReferences', () => {
      const slice = new EndpointSlice({
        metadata: {
          name: 'test-slice',
          namespace: 'default',
          labels: {
            'kubernetes.io/service-name': 'service-from-label',
          },
          ownerReferences: [
            {
              apiVersion: 'v1',
              kind: 'Service',
              name: 'service-from-owner',
              uid: '12345',
            },
          ],
        },
      } as any);

      expect(slice.getOwnerServiceName()).toBe('service-from-label');
    });

    it('returns undefined when neither label nor ownerReferences are present', () => {
      const slice = new EndpointSlice({
        metadata: {
          name: 'orphan-slice',
          namespace: 'default',
        },
      } as any);

      expect(slice.getOwnerServiceName()).toBeUndefined();
    });

    it('returns undefined when ownerReferences does not contain Service kind', () => {
      const slice = new EndpointSlice({
        metadata: {
          name: 'other-owner-slice',
          namespace: 'default',
          ownerReferences: [
            {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              name: 'nginx',
              uid: '12345',
            },
          ],
        },
      } as any);

      expect(slice.getOwnerServiceName()).toBeUndefined();
    });

    it('handles labels without kubernetes.io/service-name', () => {
      const slice = new EndpointSlice({
        metadata: {
          name: 'other-label-slice',
          namespace: 'default',
          labels: {
            app: 'nginx',
          },
        },
      } as any);

      expect(slice.getOwnerServiceName()).toBeUndefined();
    });
  });
});
