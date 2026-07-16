/**
 * 擬似言語の記述形式（基本情報技術者試験用）
 * 出典: IPA 基本情報技術者試験 科目B 公開問題の巻頭資料（令和8年度版）
 * 参考資料オーバーレイの「資料」タブに表示する。
 */
export function PseudoCodeReference() {
  return (
    <div className="pseudo-ref">
      <h4 className="pseudo-ref-title">擬似言語の記述形式（基本情報技術者試験用）</h4>
      <p className="pseudo-ref-intro">
        擬似言語を使用した問題では，各問題文中に注記がない限り，次の記述形式が適用されているものとする。
      </p>

      <h5>〔擬似言語の記述形式〕</h5>
      <table className="pseudo-ref-table">
        <thead>
          <tr>
            <th className="pseudo-ref-col-form">記述形式</th>
            <th>説明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <pre>○手続名又は関数名</pre>
            </td>
            <td>手続又は関数を宣言する。</td>
          </tr>
          <tr>
            <td>
              <pre>型名: 変数名</pre>
            </td>
            <td>変数を宣言する。</td>
          </tr>
          <tr>
            <td>
              <pre>{"/* 注釈 */\n// 注釈"}</pre>
            </td>
            <td>注釈を記述する。</td>
          </tr>
          <tr>
            <td>
              <pre>変数名 ← 式</pre>
            </td>
            <td>変数に式の値を代入する。</td>
          </tr>
          <tr>
            <td>
              <pre>手続名又は関数名(引数, …)</pre>
            </td>
            <td>手続又は関数を呼び出し，引数を受け渡す。</td>
          </tr>
          <tr>
            <td>
              <pre>{"if (条件式 1)\n  処理 1\nelseif (条件式 2)\n  処理 2\nelseif (条件式 n)\n  処理 n\nelse\n  処理 n ＋ 1\nendif"}</pre>
            </td>
            <td>
              選択処理を示す。
              <br />
              条件式を上から評価し，最初に真になった条件式に対応する処理を実行する。以降の条件式は評価せず，対応する処理も実行しない。どの条件式も真にならないときは，処理
              n ＋ 1 を実行する。
              <br />
              各処理は，0 以上の文の集まりである。
              <br />
              elseif と処理の組みは，複数記述することがあり，省略することもある。
              <br />
              else と処理 n ＋ 1 の組みは一つだけ記述し，省略することもある。
            </td>
          </tr>
          <tr>
            <td>
              <pre>{"while (条件式)\n  処理\nendwhile"}</pre>
            </td>
            <td>
              前判定繰返し処理を示す。
              <br />
              条件式が真の間，処理を繰返し実行する。
              <br />
              処理は，0 以上の文の集まりである。
            </td>
          </tr>
          <tr>
            <td>
              <pre>{"do\n  処理\nwhile (条件式)"}</pre>
            </td>
            <td>
              後判定繰返し処理を示す。
              <br />
              処理を実行し，条件式が真の間，処理を繰返し実行する。
              <br />
              処理は，0 以上の文の集まりである。
            </td>
          </tr>
          <tr>
            <td>
              <pre>{"for (制御記述)\n  処理\nendfor"}</pre>
            </td>
            <td>
              繰返し処理を示す。
              <br />
              制御記述の内容に基づいて，処理を繰返し実行する。
              <br />
              処理は，0 以上の文の集まりである。
            </td>
          </tr>
        </tbody>
      </table>

      <h5>〔演算子と優先順位〕</h5>
      <table className="pseudo-ref-table pseudo-ref-table--ops">
        <thead>
          <tr>
            <th colSpan={2}>演算子の種類</th>
            <th>演算子</th>
            <th>優先度</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2}>式</td>
            <td>() .</td>
            <td className="pseudo-ref-priority" rowSpan={7}>
              高
              <br />↑<br />↓<br />低
            </td>
          </tr>
          <tr>
            <td colSpan={2}>単項演算子</td>
            <td>not ＋ －</td>
          </tr>
          <tr>
            <td rowSpan={5}>二項演算子</td>
            <td>乗除</td>
            <td>mod × ÷</td>
          </tr>
          <tr>
            <td>加減</td>
            <td>＋ －</td>
          </tr>
          <tr>
            <td>関係</td>
            <td>≠ ≦ ≧ ＜ ＝ ＞</td>
          </tr>
          <tr>
            <td>論理積</td>
            <td>and</td>
          </tr>
          <tr>
            <td>論理和</td>
            <td>or</td>
          </tr>
        </tbody>
      </table>
      <p className="pseudo-ref-note">
        注記　演算子 . は，メンバ変数又はメソッドのアクセスを表す。
        <br />
        　　　演算子 mod は，剰余算を表す。
      </p>

      <h5>〔論理型の定数〕</h5>
      <p>true，false</p>

      <h5>〔配列〕</h5>
      <p>
        配列の要素は，"["と"]"の間にアクセス対象要素の要素番号を指定することでアクセスする。なお，二次元配列の要素番号は，行番号，列番号の順に","で区切って指定する。
        <br />
        "{"{"}"は配列の内容の始まりを，"{"}"}"は配列の内容の終わりを表す。ただし，二次元配列において，内側の"{"{"}"と"{"}"}"に囲まれた部分は，1 行分の内容を表す。
      </p>

      <h5>〔未定義，未定義の値〕</h5>
      <p>
        変数に値が格納されていない状態を，"未定義"という。変数に"未定義の値"を代入すると，その変数は未定義になる。
      </p>
    </div>
  );
}
