uniform sampler2D tColor;

  void main() {
    vec2 px = vec2( abs( dFdx( vUv.x ) ), abs( dFdy( vUv.y ) ) );
    float pxY = max( px.y, 1e-6 );
    float maxRadPx = maxblur / pxY;

    vec4 center = texture2D( tColor, vUv );
    float centerDist = viewDist( vUv );
    float centerCoc = cocPx( centerDist, pxY );

    // adaptive reach: full radius only where the pixel (or potential
    // foreground spill) needs it
    float radius = min( maxRadPx, max( centerCoc * 1.15, maxRadPx * 0.25 ) );

    // flatness early-out: fully-blurred flat regions (mostly the solid
    // background) blur to themselves — probe a ring and skip the gather
    if ( centerCoc >= maxRadPx * 0.95 ) {
      vec4 p0 = texture2D( tColor, vUv + vec2( radius * px.x, 0.0 ) );
      vec4 p1 = texture2D( tColor, vUv - vec2( radius * px.x, 0.0 ) );
      vec4 p2 = texture2D( tColor, vUv + vec2( 0.0, radius * px.y ) );
      vec4 p3 = texture2D( tColor, vUv - vec2( 0.0, radius * px.y ) );
      vec4 avg = ( p0 + p1 + p2 + p3 ) * 0.25;
      float dev = dot( abs( p0 - avg ).rgb + abs( p1 - avg ).rgb + abs( p2 - avg ).rgb + abs( p3 - avg ).rgb, vec3( 1.0 ) )
        + abs( center.a - avg.a ) * 4.0;
      if ( dev < 0.02 ) {
        gl_FragColor = mix( center, avg, 0.5 );
        return;
      }
    }

    // per-pixel rotation turns ring artifacts into fine noise
    float rnd = fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) * 6.28318;

    vec4 acc = center;
    float tot = 1.0;
    const int N = 96;
    // tap count scales with the disc area actually gathered
    float nEff = clamp( radius * radius * 0.1, 12.0, float( N ) );
    const float GOLDEN = 2.39996323;
    for ( int i = 1; i <= N; i ++ ) {
      float fi = float( i );
      if ( fi > nEff ) break;
      float ang = fi * GOLDEN + rnd;
      float rad = radius * sqrt( fi / nEff );
      vec2 tc = vUv + vec2( cos( ang ) * px.x, sin( ang ) * px.y ) * rad;
      vec4 sColor = texture2D( tColor, tc );
      float sDist = viewDist( tc );
      float sCoc = cocPx( sDist, pxY );
      // background may not bleed over a sharp foreground
      if ( sDist > centerDist ) sCoc = min( sCoc, centerCoc * 2.0 + 1.0 );
      float m = smoothstep( rad - 1.0, rad + 1.0, sCoc );
      acc += mix( acc / tot, sColor, m );
      tot += 1.0;
    }
    gl_FragColor = acc / tot;
  }
