<template>
  <div></div>
</template>

<script>
import UserContext from '@/app/user/UserContext'
import {SpireApi} from "@/app/api/spire-api";
export default {
  name: 'AuthCallback',
  mounted() {
    const jwt = this.$route.query.jwt;
    UserContext.reset()
    UserContext.storeAccessToken(jwt)
    SpireApi.reloadAxios()
    window.close()
  }
}
</script>
