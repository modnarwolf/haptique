#include <common>
  #include <packing>
  varying vec2 vUv;
  uniform sampler2D tDepth;
  uniform float focus;
  uniform float focalDepth;
  uniform float aperture;
  uniform float maxblur;
  uniform float nearClip;
  uniform float farClip;

  float viewDist( const in vec2 uv ) {
    float d = unpackRGBAToDepth( texture2D( tDepth, uv ) );
    return -perspectiveDepthToViewZ( d, nearClip, farClip );
  }

  float cocPx( const in float dist, const in float pxY ) {
    float excess = abs( dist - focus ) - focalDepth;
    if ( excess <= 0.0 ) return 0.0;
    return min( aperture * excess / max( dist, 0.2 ), maxblur ) / pxY;
  }
